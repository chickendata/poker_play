import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import type { Stage } from "@poker/shared";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") seat = -1;
  @type("number") chips = 0;
  /** Chips committed in the current betting round. */
  @type("number") bet = 0;
  /** Chips committed in the current hand (for side pots later). */
  @type("number") totalBet = 0;
  /** "active" | "folded" | "all-in" | "waiting" | "out" */
  @type("string") status = "waiting";
  @type("boolean") connected = true;
  @type("boolean") hasActed = false;
  /** True when this player has been dealt hole cards this hand.
      The cards themselves are sent privately via `client.send("hole", ...)`. */
  @type("boolean") hasHoleCards = false;
  /** Public reveal of hole cards — populated only at showdown so all clients can see. */
  @type(["string"]) revealedHole = new ArraySchema<string>();
  /** Hand category at showdown (e.g. "two_pair"). Empty unless cards revealed. */
  @type("string") revealedCategory = "";
  /** Guest "ready" flag — only meaningful in private rooms before the first hand. */
  @type("boolean") ready = false;
}

export class SidePotInfo extends Schema {
  @type("number") amount = 0;
  @type(["string"]) eligibleIds = new ArraySchema<string>();
}

export class Winner extends Schema {
  @type("string") id = "";
  @type("number") amount = 0;
  /** Hand category name, e.g. "flush", "two_pair". Empty when uncontested fold. */
  @type("string") category = "";
}

export class PokerState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) communityCards = new ArraySchema<string>();
  @type([Winner]) winners = new ArraySchema<Winner>();
  @type([SidePotInfo]) sidePots = new ArraySchema<SidePotInfo>();

  @type("string") tableName = "";
  @type("boolean") isPrivate = false;
  /** sessionId of the room host (first joiner). They control "start" in private rooms. */
  @type("string") hostId = "";

  @type("string") stage: Stage = "waiting";
  @type("number") pot = 0;
  @type("number") currentBet = 0;
  @type("number") minRaise = 0;
  @type("number") smallBlind = 0;
  @type("number") bigBlind = 0;

  /** Seat (not array index) of the dealer button. -1 when no hand in progress. */
  @type("number") dealerSeat = -1;
  /** Seat of the player whose turn it is. -1 when no hand in progress. */
  @type("number") activeSeat = -1;
  /** Epoch ms when the active player's turn auto-folds. 0 when no timer is armed. */
  @type("number") turnDeadline = 0;
}
