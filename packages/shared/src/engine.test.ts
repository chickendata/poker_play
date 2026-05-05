import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "./cards.js";
import { applyAction, startHand, type GameState } from "./engine.js";

/** Build a deck so that .pop() returns `dealOrder[0]`, then `dealOrder[1]`, etc. */
function deckThatDeals(dealOrder: string[]): Card[] {
  return dealOrder.slice().reverse() as Card[];
}

/** Convenience: get a player by id. */
function pid(state: GameState, id: string) {
  const p = state.players.find((q) => q.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}

test("startHand: heads-up posts blinds, deals 2 hole cards each, SB acts first", () => {
  const s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
  });

  assert.equal(s.stage, "preflop");
  assert.equal(s.pot, 15);
  assert.equal(s.players[0].chips, 995); // SB (heads-up: dealer = SB)
  assert.equal(s.players[1].chips, 990); // BB
  assert.equal(s.currentBet, 10);
  assert.equal(s.toActIdx, 0); // heads-up: SB acts first preflop
  assert.ok(s.players[0].hole && s.players[1].hole);
});

test("fold ends hand: opponent wins pot (uncontested)", () => {
  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
  });
  // SB folds preflop
  s = applyAction(s, "A", { type: "fold" });
  assert.equal(s.stage, "complete");
  assert.equal(s.winners?.length, 1);
  assert.equal(s.winners?.[0].id, "B");
  // Pot was 15, B paid 10, gets 15 back → net +5
  assert.equal(pid(s, "B").chips, 1005);
  assert.equal(pid(s, "A").chips, 995);
});

test("full hand: AA vs KK, board misses, AA wins at showdown", () => {
  // 3 players, dealer at idx 0. Hole-card deal order (dealer rotation):
  //   round 1: p1, p2, p0     round 2: p1, p2, p0
  // Then: burn, flop×3, burn, turn, burn, river
  const dealOrder = [
    "Kh", "Qs", "As",   // round 1: B gets Kh, C gets Qs, A gets As
    "Kd", "Qc", "Ac",   // round 2: B gets Kd, C gets Qc, A gets Ac
    "2d",                // burn
    "7s", "8d", "9c",   // flop
    "2c",                // burn
    "3h",                // turn
    "2s",                // burn
    "4d",                // river
  ];

  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
      { id: "C", seat: 2, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
    deck: deckThatDeals(dealOrder),
  });

  // Sanity: A=AA, B=KK, C=QQ
  assert.deepEqual(pid(s, "A").hole, ["As", "Ac"]);
  assert.deepEqual(pid(s, "B").hole, ["Kh", "Kd"]);
  assert.deepEqual(pid(s, "C").hole, ["Qs", "Qc"]);

  // Preflop: 3-player → SB at idx 1, BB at idx 2, UTG (toActIdx) = idx 0 (A)
  assert.equal(s.toActIdx, 0);

  // A calls 10, B (SB) calls 5 more, C (BB) checks
  s = applyAction(s, "A", { type: "call" });
  assert.equal(s.toActIdx, 1);
  s = applyAction(s, "B", { type: "call" });
  assert.equal(s.toActIdx, 2);
  s = applyAction(s, "C", { type: "check" });
  // Round done → flop dealt. Post-flop, first to act = first active left of dealer = idx 1 (B)
  assert.equal(s.stage, "flop");
  assert.equal(s.community.length, 3);
  assert.deepEqual(s.community, ["7s", "8d", "9c"]);
  assert.equal(s.toActIdx, 1);

  // Everyone checks the flop
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });
  s = applyAction(s, "A", { type: "check" });
  assert.equal(s.stage, "turn");
  assert.equal(s.community.length, 4);

  // Everyone checks the turn
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });
  s = applyAction(s, "A", { type: "check" });
  assert.equal(s.stage, "river");
  assert.equal(s.community.length, 5);

  // Everyone checks the river → showdown
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });
  s = applyAction(s, "A", { type: "check" });

  assert.equal(s.stage, "complete");
  assert.equal(s.winners?.length, 1);
  assert.equal(s.winners?.[0].id, "A");
  // Pot was 30; A paid 10, gets 30 back → net +20
  assert.equal(pid(s, "A").chips, 1020);
  assert.equal(pid(s, "B").chips, 990);
  assert.equal(pid(s, "C").chips, 990);
});

test("raise + fold: aggressor wins without showdown", () => {
  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
      { id: "C", seat: 2, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
  });

  // A (UTG) raises to 30, B folds, C folds → A wins pot uncontested
  s = applyAction(s, "A", { type: "raise", amount: 30 });
  assert.equal(s.currentBet, 30);
  assert.equal(s.toActIdx, 1);
  s = applyAction(s, "B", { type: "fold" });
  s = applyAction(s, "C", { type: "fold" });

  assert.equal(s.stage, "complete");
  assert.equal(s.winners?.[0].id, "A");
  // Pot before A wins: SB(5) + BB(10) + A's 30 = 45
  assert.equal(pid(s, "A").chips, 1015);
});

test("illegal action: not your turn throws", () => {
  const s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
      { id: "C", seat: 2, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
  });
  // A is to act (UTG)
  assert.throws(() => applyAction(s, "B", { type: "call" }), /not your turn/);
});

test("illegal action: check when there is a bet to call", () => {
  const s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
  });
  // SB owes 5 to call
  assert.throws(() => applyAction(s, "A", { type: "check" }), /cannot check/);
});

test("side pot: short-stack all-in wins main, deeper stack wins side", () => {
  // A short-stack (50 chips) all-in vs B and C (500 each).
  // A=AA wins main pot (eligible), B=KK wins side pot (A excluded), C=QQ loses both.
  //
  // 3 players, dealerIdx=2 (C). Hole-card deal order: A, B, C, A, B, C.
  // Then community: burn, flop×3, burn, turn, burn, river.
  const dealOrder = [
    "As", "Kh", "Qd",   // round 1: A=As, B=Kh, C=Qd
    "Ac", "Ks", "Qh",   // round 2: A=Ac, B=Ks, C=Qh
    "2d",                // burn
    "2c", "7d", "9s",   // flop — board misses everyone
    "3d",                // burn
    "Th",                // turn
    "5d",                // burn
    "4d",                // river  (3 diamonds on board: 7d, Th? no Th is hearts. Just 7d+4d → no flush)
  ];

  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 50 },
      { id: "B", seat: 1, chips: 500 },
      { id: "C", seat: 2, chips: 500 },
    ],
    dealerIdx: 2,
    smallBlind: 5,
    bigBlind: 10,
    deck: deckThatDeals(dealOrder),
  });
  // Sanity: A=AA, B=KK, C=QQ
  assert.deepEqual(pid(s, "A").hole, ["As", "Ac"]);
  assert.deepEqual(pid(s, "B").hole, ["Kh", "Ks"]);
  assert.deepEqual(pid(s, "C").hole, ["Qd", "Qh"]);

  // Preflop. After SB=A(5) BB=B(10), UTG=C acts first.
  assert.equal(s.toActIdx, 2);
  s = applyAction(s, "C", { type: "raise", amount: 100 });
  // A all-in (only 45 chips left after SB, owes 95 → calls 45 → all-in for 50 total)
  s = applyAction(s, "A", { type: "call" });
  assert.equal(pid(s, "A").status, "all-in");
  assert.equal(pid(s, "A").totalBet, 50);
  // B calls
  s = applyAction(s, "B", { type: "call" });

  // Round complete → flop dealt; only B and C can act
  assert.equal(s.stage, "flop");
  assert.deepEqual(s.community, ["2c", "7d", "9s"]);

  // Check it down: B acts first post-flop (first active left of dealer)
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "C", { type: "check" });

  assert.equal(s.stage, "complete");

  // Pot was 250 = A's 50 + B's 100 + C's 100
  // Side pots:
  //   Pot 0 (cap 50):  50*3 = 150, eligible A,B,C → AA wins → A gets 150
  //   Pot 1 (cap 100): 50*2 = 100, eligible B,C   → KK wins → B gets 100
  assert.equal(pid(s, "A").chips, 150); // started 50, won 150 main pot
  assert.equal(pid(s, "B").chips, 500); // started 500, bet 100, won 100 side → break even
  assert.equal(pid(s, "C").chips, 400); // started 500, bet 100, won nothing
  // Chip total conserved
  const total =
    pid(s, "A").chips + pid(s, "B").chips + pid(s, "C").chips;
  assert.equal(total, 1050);

  // Both A and B should appear in winners
  const winnerIds = (s.winners ?? []).map((w) => w.id).sort();
  assert.deepEqual(winnerIds, ["A", "B"]);
});

test("uncalled bet refund: heads-up all-in larger than opponent stack", () => {
  // A=200 chips, B=100 chips. Heads-up. SB=A=5, BB=B=10. SB acts first preflop.
  // A all-in raises to 200. B all-in calls 90 more (only has 90 left after BB).
  // A's bet of 200 vs B's effective 100 → 100 of A's bet is uncalled.
  // Uncontested side pot at cap 200 refunds A 100. Main pot (200) decided at showdown.
  //
  // Heads-up dealing: dealerIdx=0, deal starts at (0+1)%2=1 then (0+1+1)%2=0
  // r1: B, A.   r2: B, A.
  const dealOrder = [
    "Kh", "As",          // r1: B=Kh, A=As
    "Ks", "Ac",          // r2: B=Ks, A=Ac  → A=AA, B=KK
    "2d",                 // burn
    "7c", "8d", "9s",    // flop
    "3d",                 // burn
    "Th",                 // turn
    "5d",                 // burn
    "4d",                 // river — A wins with AA
  ];
  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 200 },
      { id: "B", seat: 1, chips: 100 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
    deck: deckThatDeals(dealOrder),
  });
  assert.deepEqual(pid(s, "A").hole, ["As", "Ac"]);
  assert.deepEqual(pid(s, "B").hole, ["Kh", "Ks"]);

  // A is SB and acts first. Raise to 200 = all-in.
  s = applyAction(s, "A", { type: "raise", amount: 200 });
  assert.equal(pid(s, "A").status, "all-in");
  assert.equal(pid(s, "A").totalBet, 200);
  // B calls (has 90 left → all-in for 90 → totalBet=100)
  s = applyAction(s, "B", { type: "call" });
  assert.equal(pid(s, "B").status, "all-in");
  assert.equal(pid(s, "B").totalBet, 100);

  // Both all-in → engine auto-runs board to showdown
  assert.equal(s.stage, "complete");

  // A wins showdown (AA > KK), gets main pot of 200.
  // A also gets 100 refund (uncontested side pot).
  // Net: A had 200, all-in 200, gets back 200+100 = 300 → +100. B: 100→0 → -100.
  assert.equal(pid(s, "A").chips, 300);
  assert.equal(pid(s, "B").chips, 0);
  // Conservation: 300 = 200 + 100 ✓
});

test("split pot: tie at showdown divides pot evenly", () => {
  // Both players get the SAME hole cards by suit (impossible in real poker but
  // valid for the engine — the test just asserts splitting math).
  // 2-player. To force a tie, give each a flush-blocking pair plus board makes both equal.
  // Simpler: A=AsKs, B=AhKh, board=2c 7d 8d Tc Jc → both have just A-high (no flush, no straight, no pair)
  const dealOrder = [
    "Ah", "As",         // r1: B=Ah, A=As (heads-up: dealer/SB=A is idx 0, other=B is idx 1; deal starts left of dealer = idx 1)
    "Kh", "Ks",         // r2: B=Kh, A=Ks
    "2c",                // burn
    "2d", "7d", "8d",   // flop
    "9c",                // burn
    "Tc",                // turn
    "9d",                // burn
    "Jc",                // river
  ];
  let s = startHand({
    players: [
      { id: "A", seat: 0, chips: 1000 },
      { id: "B", seat: 1, chips: 1000 },
    ],
    dealerIdx: 0,
    smallBlind: 5,
    bigBlind: 10,
    deck: deckThatDeals(dealOrder),
  });
  assert.deepEqual(pid(s, "A").hole, ["As", "Ks"]);
  assert.deepEqual(pid(s, "B").hole, ["Ah", "Kh"]);

  // Heads-up: SB (A) acts first preflop
  s = applyAction(s, "A", { type: "call" });
  s = applyAction(s, "B", { type: "check" });
  // Post-flop heads-up: BB (B) acts first
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "A", { type: "check" });
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "A", { type: "check" });
  s = applyAction(s, "B", { type: "check" });
  s = applyAction(s, "A", { type: "check" });

  assert.equal(s.stage, "complete");
  // Pot was 20, split → 10 each, both end at 1000
  assert.equal(s.winners?.length, 2);
  assert.equal(pid(s, "A").chips, 1000);
  assert.equal(pid(s, "B").chips, 1000);
});
