/**
 * Texas Hold'em engine — pure functions over an immutable-ish GameState.
 *
 * Scope of this MVP:
 *   - 2..9 players, single pot (NO side pots — see TODO at settleHand)
 *   - blinds (SB/BB), preflop → flop → turn → river → showdown
 *   - actions: fold, check, call, bet, raise (all-in is just bet/call with all chips)
 *   - auto-advance through streets when a round completes
 *   - awards pot to best hand, splits ties evenly (remainder goes to first seat after dealer)
 *
 * Caller (server) is responsible for:
 *   - rotating dealerIdx between hands
 *   - calling startHand() with up-to-date player list and stack sizes
 *   - validating playerId belongs to the session calling applyAction
 */

import type { Card } from "./cards.js";
import { freshDeck } from "./cards.js";
import { shuffle } from "./shuffle.js";
import {
  compareHands,
  evaluateBest,
  rankShowdown,
  type HandRank,
} from "./handEval.js";
import { computeSidePots } from "./sidePots.js";
import type { Stage } from "./types.js";

export type PlayerStatus = "active" | "folded" | "all-in";

export interface PlayerState {
  id: string;
  seat: number;
  chips: number;
  hole: [Card, Card] | null;
  /** Chips committed in the CURRENT betting round. */
  bet: number;
  /** Chips committed across the entire hand (for future side-pot use). */
  totalBet: number;
  status: PlayerStatus;
  /** Has the player taken a voluntary action this round? Resets each stage. */
  hasActed: boolean;
}

export interface GameState {
  deck: Card[];
  community: Card[];
  players: PlayerState[];
  dealerIdx: number;
  smallBlind: number;
  bigBlind: number;
  stage: Stage;
  pot: number;
  currentBet: number;
  minRaise: number;
  toActIdx: number;
  /** When action returns here, the round is over. */
  lastAggressorIdx: number;
  winners?: { id: string; amount: number; rank?: HandRank }[];
}

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number };

export interface StartHandOptions {
  players: { id: string; seat: number; chips: number }[];
  dealerIdx: number;
  smallBlind: number;
  bigBlind: number;
  /** Override deck for deterministic tests. */
  deck?: Card[];
}

/* ──────────────────────────  Public API  ────────────────────────── */

export function startHand(opts: StartHandOptions): GameState {
  const { players, dealerIdx, smallBlind, bigBlind } = opts;
  if (players.length < 2) throw new Error("need at least 2 players");

  const deck = (opts.deck ? opts.deck.slice() : shuffle(freshDeck())).slice();

  const ps: PlayerState[] = players
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      id: p.id,
      seat: p.seat,
      chips: p.chips,
      hole: null,
      bet: 0,
      totalBet: 0,
      status: "active" as PlayerStatus,
      hasActed: false,
    }));

  const n = ps.length;
  const sbIdx = (dealerIdx + (n === 2 ? 0 : 1)) % n; // heads-up: dealer posts SB
  const bbIdx = (dealerIdx + (n === 2 ? 1 : 2)) % n;

  const state: GameState = {
    deck,
    community: [],
    players: ps,
    dealerIdx,
    smallBlind,
    bigBlind,
    stage: "preflop",
    pot: 0,
    currentBet: bigBlind,
    minRaise: bigBlind,
    toActIdx: (bbIdx + 1) % n,
    lastAggressorIdx: bbIdx,
  };

  // Post blinds (forced bets — do NOT mark hasActed)
  postBlind(state, sbIdx, smallBlind);
  postBlind(state, bbIdx, bigBlind);

  // Deal 2 hole cards to each (one at a time, starting left of dealer — standard order)
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < n; i++) {
      const idx = (dealerIdx + 1 + i) % n;
      const card = state.deck.pop();
      if (!card) throw new Error("deck underflow");
      const p = state.players[idx];
      if (!p.hole) p.hole = [card, card]; // placeholder; second slot overwritten below
      if (r === 0) p.hole = [card, p.hole[1]];
      else p.hole = [p.hole[0], card];
    }
  }

  return state;
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: Action,
): GameState {
  if (state.stage === "complete" || state.stage === "showdown") {
    throw new Error("hand is over");
  }
  const idx = state.toActIdx;
  const p = state.players[idx];
  if (p.id !== playerId) {
    throw new Error(`not your turn (acting=${p.id}, sender=${playerId})`);
  }

  switch (action.type) {
    case "fold":
      p.status = "folded";
      p.hasActed = true;
      break;

    case "check":
      if (p.bet !== state.currentBet) {
        throw new Error(
          `cannot check; need to call ${state.currentBet - p.bet}`,
        );
      }
      p.hasActed = true;
      break;

    case "call": {
      const owed = state.currentBet - p.bet;
      if (owed <= 0) throw new Error("nothing to call; use check");
      const pay = Math.min(owed, p.chips);
      moveChips(p, pay);
      state.pot += pay;
      if (p.chips === 0) p.status = "all-in";
      p.hasActed = true;
      break;
    }

    case "bet": {
      if (state.currentBet > 0) {
        throw new Error("there is already a bet; use raise");
      }
      if (action.amount < state.bigBlind) {
        throw new Error(`min bet is ${state.bigBlind}`);
      }
      if (action.amount > p.chips) throw new Error("not enough chips");
      moveChips(p, action.amount);
      state.pot += action.amount;
      state.currentBet = p.bet;
      state.minRaise = action.amount;
      state.lastAggressorIdx = idx;
      resetHasActedExcept(state, idx);
      if (p.chips === 0) p.status = "all-in";
      p.hasActed = true;
      break;
    }

    case "raise": {
      // amount = total bet for this round (not the increment), matches most APIs
      const target = action.amount;
      const increment = target - state.currentBet;
      if (increment < state.minRaise) {
        throw new Error(`min raise is to ${state.currentBet + state.minRaise}`);
      }
      const owed = target - p.bet;
      if (owed > p.chips) throw new Error("not enough chips");
      moveChips(p, owed);
      state.pot += owed;
      state.currentBet = target;
      state.minRaise = increment;
      state.lastAggressorIdx = idx;
      resetHasActedExcept(state, idx);
      if (p.chips === 0) p.status = "all-in";
      p.hasActed = true;
      break;
    }
  }

  // Single survivor → award pot immediately
  const notFolded = state.players.filter((q) => q.status !== "folded");
  if (notFolded.length === 1) {
    awardPot(state, [notFolded[0].id]);
    state.stage = "complete";
    return state;
  }

  if (isRoundComplete(state)) {
    advanceStage(state);
  } else {
    state.toActIdx = nextActiveIdx(state, idx);
  }

  return state;
}

/* ──────────────────────────  Internals  ────────────────────────── */

function postBlind(state: GameState, idx: number, amount: number) {
  const p = state.players[idx];
  const pay = Math.min(amount, p.chips);
  moveChips(p, pay);
  state.pot += pay;
  if (p.chips === 0) p.status = "all-in";
}

function moveChips(p: PlayerState, amount: number) {
  p.chips -= amount;
  p.bet += amount;
  p.totalBet += amount;
}

function resetHasActedExcept(state: GameState, exceptIdx: number) {
  state.players.forEach((p, i) => {
    if (i !== exceptIdx && p.status === "active") p.hasActed = false;
  });
}

function nextActiveIdx(state: GameState, fromIdx: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const j = (fromIdx + i) % n;
    if (state.players[j].status === "active") return j;
  }
  return fromIdx;
}

function isRoundComplete(state: GameState): boolean {
  const active = state.players.filter((p) => p.status === "active");
  if (active.length === 0) return true; // everyone folded or all-in
  if (active.length === 1) {
    // Lone active player still must call/fold any outstanding bet
    return active[0].bet === state.currentBet;
  }
  return active.every((p) => p.hasActed && p.bet === state.currentBet);
}

function advanceStage(state: GameState) {
  // Reset round-level fields
  for (const p of state.players) {
    p.bet = 0;
    if (p.status === "active") p.hasActed = false;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;

  switch (state.stage) {
    case "preflop":
      dealCommunity(state, 3);
      state.stage = "flop";
      break;
    case "flop":
      dealCommunity(state, 1);
      state.stage = "turn";
      break;
    case "turn":
      dealCommunity(state, 1);
      state.stage = "river";
      break;
    case "river":
      runShowdown(state);
      return;
    default:
      return;
  }

  // First to act post-flop is first active player left of dealer
  const firstIdx = nextActiveIdx(state, state.dealerIdx);
  state.toActIdx = firstIdx;
  state.lastAggressorIdx = firstIdx;

  // If no one can voluntarily act (≤1 active, others all-in), keep advancing
  const active = state.players.filter((p) => p.status === "active");
  if (active.length <= 1) advanceStage(state);
}

function dealCommunity(state: GameState, n: number) {
  // Standard rule: burn 1, then deal n. Burn is purely cosmetic but kept for fidelity.
  state.deck.pop();
  for (let i = 0; i < n; i++) {
    const c = state.deck.pop();
    if (!c) throw new Error("deck underflow");
    state.community.push(c);
  }
}

function runShowdown(state: GameState) {
  state.stage = "showdown";

  // Pre-evaluate hands for every contender (folded players excluded)
  const handById = new Map<string, HandRank>();
  for (const p of state.players) {
    if (p.status !== "folded" && p.hole) {
      handById.set(p.id, evaluateBest([...p.hole, ...state.community]));
    }
  }

  const { pots, refunds } = computeSidePots(state.players);

  // Aggregate winnings per player so the UI can show "X wins $Y total"
  // (a player can win multiple side pots in the same hand).
  const winningsById = new Map<string, { amount: number; rank?: HandRank }>();
  const addWinning = (id: string, amount: number, rank?: HandRank) => {
    const existing = winningsById.get(id);
    if (existing) {
      existing.amount += amount;
      // Show the strongest rank among the pots they won
      if (
        rank &&
        (!existing.rank || compareHands(rank, existing.rank) === 1)
      ) {
        existing.rank = rank;
      }
    } else {
      winningsById.set(id, { amount, rank });
    }
  };

  for (const pot of pots) {
    const contenders = pot.eligibleIds
      .filter((id) => handById.has(id))
      .map((id) => ({ id, rank: handById.get(id)! }));
    if (contenders.length === 0) continue; // shouldn't happen — eligibles by definition aren't folded

    let winners: string[];
    let winningRank: HandRank;
    if (contenders.length === 1) {
      winners = [contenders[0].id];
      winningRank = contenders[0].rank;
    } else {
      const buckets: { ids: string[]; rank: HandRank }[] = [];
      for (const c of contenders) {
        const b = buckets.find(
          (x) => compareHands(x.rank, c.rank) === 0,
        );
        if (b) b.ids.push(c.id);
        else buckets.push({ ids: [c.id], rank: c.rank });
      }
      buckets.sort((a, b) => compareHands(b.rank, a.rank));
      winners = buckets[0].ids;
      winningRank = buckets[0].rank;
    }

    const sortedWinners = sortByDealerOrder(winners, state);
    const share = Math.floor(pot.amount / sortedWinners.length);
    const remainder = pot.amount - share * sortedWinners.length;
    sortedWinners.forEach((id, i) => {
      addWinning(id, share + (i === 0 ? remainder : 0), winningRank);
    });
  }

  // Apply refunds silently (player gets chips back, not shown as a "winner")
  for (const r of refunds) {
    const p = state.players.find((q) => q.id === r.id);
    if (p) p.chips += r.amount;
  }

  // Apply winnings + populate state.winners
  state.winners = [];
  for (const [id, data] of winningsById) {
    const p = state.players.find((q) => q.id === id);
    if (p) p.chips += data.amount;
    state.winners.push({ id, amount: data.amount, rank: data.rank });
  }
  state.pot = 0;
  state.stage = "complete";
}

/** Award the entire pot to a single uncontested survivor (fold-out path). */
function awardPot(state: GameState, winnerIds: string[]) {
  const share = Math.floor(state.pot / winnerIds.length);
  const remainder = state.pot - share * winnerIds.length;
  const sortedWinners = sortByDealerOrder(winnerIds, state);
  state.winners = sortedWinners.map((id, i) => ({
    id,
    amount: share + (i === 0 ? remainder : 0),
  }));
  for (const w of state.winners) {
    const p = state.players.find((q) => q.id === w.id);
    if (p) p.chips += w.amount;
  }
  state.pot = 0;
}

function sortByDealerOrder(ids: readonly string[], state: GameState): string[] {
  return [...ids].sort((a, b) => {
    const ai = state.players.findIndex((p) => p.id === a);
    const bi = state.players.findIndex((p) => p.id === b);
    const aDist =
      (ai - state.dealerIdx + state.players.length) % state.players.length;
    const bDist =
      (bi - state.dealerIdx + state.players.length) % state.players.length;
    return aDist - bDist;
  });
}
