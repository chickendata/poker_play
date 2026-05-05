import { Room, Client, ServerError } from "colyseus";
import {
  applyAction,
  computeSidePots,
  startHand,
  HAND_CATEGORIES,
  type Action,
  type Card,
  type GameState,
} from "@poker/shared";
import {
  Player,
  PokerState,
  SidePotInfo,
  Winner,
} from "./schema/PokerState.js";

const MAX_SEATS = 6;
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const NEXT_HAND_DELAY_MS = 5000;
const FIRST_HAND_DELAY_MS = 1500;
const RECONNECT_GRACE_SECONDS = 30;

export interface CreateOptions {
  private?: boolean;
  password?: string;
  tableName?: string;
}

export interface JoinOptions {
  name?: string;
  password?: string;
}

export class PokerRoom extends Room<PokerState> {
  maxClients = MAX_SEATS;
  state = new PokerState();

  /** Engine is the source of truth during a hand; schema mirrors it for clients. */
  private engine: GameState | null = null;

  /** sessionId → hole cards (dealt this hand). */
  private holeByPlayer = new Map<string, [Card, Card]>();

  private password: string | null = null;
  private nextHandTimer: NodeJS.Timeout | null = null;
  private startHandTimer: NodeJS.Timeout | null = null;

  /** Seat of the dealer for the LAST started hand (for rotating the button). */
  private lastDealerSeat = -1;

  onCreate(options: CreateOptions = {}) {
    const isPrivate = !!options.private;
    this.password = options.password?.trim() || null;

    if (isPrivate) this.setPrivate(true);

    this.state.tableName =
      options.tableName?.trim() || `Table ${this.roomId.slice(0, 4)}`;
    this.state.isPrivate = isPrivate;
    this.state.smallBlind = SMALL_BLIND;
    this.state.bigBlind = BIG_BLIND;

    this.setMetadata({
      tableName: this.state.tableName,
      isPrivate,
      hasPassword: this.password !== null,
    });

    this.onMessage<Action>("action", (client, msg) => {
      this.handleAction(client, msg);
    });

    console.log(
      `[room ${this.roomId}] created — name="${this.state.tableName}" private=${isPrivate} password=${this.password ? "yes" : "no"}`,
    );
  }

  onAuth(_client: Client, options: JoinOptions = {}) {
    if (this.password) {
      if (!options.password || options.password !== this.password) {
        throw new ServerError(401, "invalid_password");
      }
    }
    return true;
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const seat = this.findFreeSeat();
    if (seat === -1) throw new ServerError(409, "table_full");

    const player = new Player();
    player.id = client.sessionId;
    player.name =
      options.name?.trim() || `Player-${client.sessionId.slice(0, 4)}`;
    player.seat = seat;
    player.chips = STARTING_CHIPS;
    player.status = "waiting";

    this.state.players.set(client.sessionId, player);
    console.log(
      `[room ${this.roomId}] ${player.name} joined seat ${seat}`,
    );

    // Re-send hole cards if a hand is in progress (rejoin scenario)
    const existingHole = this.holeByPlayer.get(client.sessionId);
    if (existingHole) client.send("hole", { cards: existingHole });

    this.tryScheduleHand();
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false;

    // If they're currently the actor (or become so before reconnecting), auto-fold so
    // the hand can continue. Other connected players shouldn't have to wait 30s.
    this.maybeAutoFoldActor();

    if (consented) {
      this.removePlayer(client.sessionId);
      return;
    }

    try {
      await this.allowReconnection(client, RECONNECT_GRACE_SECONDS);
      p.connected = true;
      console.log(`[room ${this.roomId}] ${p.name} reconnected`);
      // Re-send hole cards if mid-hand
      const hole = this.holeByPlayer.get(client.sessionId);
      if (hole) client.send("hole", { cards: hole });
    } catch {
      console.log(
        `[room ${this.roomId}] ${p.name} reconnect timed out — removing`,
      );
      this.removePlayer(client.sessionId);
    }
  }

  private removePlayer(sessionId: string) {
    this.state.players.delete(sessionId);
    this.holeByPlayer.delete(sessionId);
    if (!this.engine || this.engine.stage === "complete") {
      this.tryScheduleHand();
    }
  }

  /* ────────────────  Hand lifecycle  ──────────────── */

  private tryScheduleHand() {
    if (this.engine && this.engine.stage !== "complete") return;
    if (this.startHandTimer || this.nextHandTimer) return;

    const eligible = this.eligiblePlayers();
    if (eligible.length < 2) return;

    this.startHandTimer = setTimeout(() => {
      this.startHandTimer = null;
      this.startNextHand();
    }, FIRST_HAND_DELAY_MS);
  }

  private scheduleNextHand() {
    if (this.nextHandTimer) return;
    this.nextHandTimer = setTimeout(() => {
      this.nextHandTimer = null;
      this.startNextHand();
    }, NEXT_HAND_DELAY_MS);
  }

  private startNextHand() {
    const eligible = this.eligiblePlayers();
    if (eligible.length < 2) {
      this.engine = null;
      this.holeByPlayer.clear();
      this.state.communityCards.clear();
      this.state.winners.clear();
      this.state.sidePots.clear();
      this.state.stage = "waiting";
      this.state.pot = 0;
      this.state.currentBet = 0;
      this.state.dealerSeat = -1;
      this.state.activeSeat = -1;
      for (const p of this.state.players.values()) {
        p.bet = 0;
        p.totalBet = 0;
        p.hasActed = false;
        p.hasHoleCards = false;
        p.revealedHole.clear();
        p.status = "waiting";
      }
      return;
    }

    eligible.sort((a, b) => a.seat - b.seat);

    let dealerIdx = 0;
    if (this.lastDealerSeat >= 0) {
      const next = eligible.findIndex((p) => p.seat > this.lastDealerSeat);
      dealerIdx = next === -1 ? 0 : next;
    }

    this.engine = startHand({
      players: eligible.map((p) => ({
        id: p.id,
        seat: p.seat,
        chips: p.chips,
      })),
      dealerIdx,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
    });

    this.lastDealerSeat = this.engine.players[this.engine.dealerIdx].seat;

    // Cache & deliver hole cards privately
    this.holeByPlayer.clear();
    for (const ep of this.engine.players) {
      if (!ep.hole) continue;
      this.holeByPlayer.set(ep.id, ep.hole);
      const c = this.clients.find((x) => x.sessionId === ep.id);
      if (c) c.send("hole", { cards: ep.hole });
    }

    // Reset reveal slots and mark non-eligible seated players as "waiting"
    for (const sp of this.state.players.values()) {
      sp.revealedHole.clear();
      if (!this.engine.players.find((ep) => ep.id === sp.id)) {
        sp.status = "waiting";
        sp.bet = 0;
        sp.totalBet = 0;
        sp.hasActed = false;
        sp.hasHoleCards = false;
      }
    }

    this.syncStateToSchema();
    // First-to-act might be a disconnected reconnecter — skip them if so
    this.maybeAutoFoldActor();

    console.log(
      `[room ${this.roomId}] hand started — dealer seat ${this.lastDealerSeat}, ${this.engine.players.length} players`,
    );
  }

  private handleAction(client: Client, msg: Action) {
    if (!this.engine || this.engine.stage === "complete") {
      client.send("error", { message: "no_hand_in_progress" });
      return;
    }
    try {
      this.engine = applyAction(this.engine, client.sessionId, msg);
      this.syncStateToSchema();
      this.handleHandIfComplete();
      this.maybeAutoFoldActor();
    } catch (e) {
      client.send("error", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private handleHandIfComplete() {
    if (this.engine && this.engine.stage === "complete") {
      this.revealShowdownCards();
      this.scheduleNextHand();
    }
  }

  /** When a hand reaches showdown, publish hole cards of non-folded players. */
  private revealShowdownCards() {
    if (!this.engine) return;
    for (const ep of this.engine.players) {
      if (ep.status === "folded" || !ep.hole) continue;
      const sp = this.state.players.get(ep.id);
      if (!sp) continue;
      sp.revealedHole.clear();
      sp.revealedHole.push(ep.hole[0]);
      sp.revealedHole.push(ep.hole[1]);
    }
  }

  /** If the player whose turn it is has disconnected, auto-fold them so play continues. */
  private maybeAutoFoldActor() {
    if (
      !this.engine ||
      this.engine.stage === "complete" ||
      this.engine.stage === "showdown"
    ) {
      return;
    }
    const ep = this.engine.players[this.engine.toActIdx];
    if (!ep || ep.status !== "active") return;
    const sp = this.state.players.get(ep.id);
    if (!sp || sp.connected) return;

    try {
      this.engine = applyAction(this.engine, ep.id, { type: "fold" });
      this.syncStateToSchema();
      this.handleHandIfComplete();
      // Chain: if next actor is also disconnected, fold them too
      this.maybeAutoFoldActor();
    } catch (e) {
      console.error(`[room ${this.roomId}] auto-fold for ${ep.id} failed:`, e);
    }
  }

  /* ────────────────  Schema sync  ──────────────── */

  private syncStateToSchema() {
    const e = this.engine;
    if (!e) return;

    this.state.communityCards.clear();
    for (const c of e.community) this.state.communityCards.push(c);

    this.state.stage = e.stage;
    this.state.pot = e.pot;
    this.state.currentBet = e.currentBet;
    this.state.minRaise = e.minRaise;
    this.state.dealerSeat = e.players[e.dealerIdx]?.seat ?? -1;
    this.state.activeSeat =
      e.stage === "complete" || e.stage === "showdown"
        ? -1
        : (e.players[e.toActIdx]?.seat ?? -1);

    for (const ep of e.players) {
      const sp = this.state.players.get(ep.id);
      if (!sp) continue;
      sp.chips = ep.chips;
      sp.bet = ep.bet;
      sp.totalBet = ep.totalBet;
      sp.status = ep.status;
      sp.hasActed = ep.hasActed;
      sp.hasHoleCards = !!ep.hole;
    }

    this.state.winners.clear();
    if (e.winners) {
      for (const w of e.winners) {
        const ws = new Winner();
        ws.id = w.id;
        ws.amount = w.amount;
        ws.category = w.rank ? HAND_CATEGORIES[w.rank.category] : "";
        this.state.winners.push(ws);
      }
    }

    // Side pots — synced even mid-hand so UI can show "Main / Side" splits
    this.state.sidePots.clear();
    if (e.stage !== "complete") {
      const { pots } = computeSidePots(e.players);
      for (const pot of pots) {
        const sp = new SidePotInfo();
        sp.amount = pot.amount;
        for (const id of pot.eligibleIds) sp.eligibleIds.push(id);
        this.state.sidePots.push(sp);
      }
    }
  }

  /* ────────────────  Helpers  ──────────────── */

  private eligiblePlayers(): Player[] {
    const out: Player[] = [];
    this.state.players.forEach((p) => {
      if (p.connected && p.chips >= BIG_BLIND) out.push(p);
    });
    return out;
  }

  private findFreeSeat(): number {
    const taken = new Set<number>();
    this.state.players.forEach((p) => taken.add(p.seat));
    for (let i = 0; i < MAX_SEATS; i++) if (!taken.has(i)) return i;
    return -1;
  }

  onDispose() {
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
    if (this.startHandTimer) clearTimeout(this.startHandTimer);
    console.log(`[room ${this.roomId}] disposed`);
  }
}
