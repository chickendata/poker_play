import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSidePots } from "./sidePots.js";

const p = (id: string, totalBet: number, status: string) => ({
  id,
  totalBet,
  status,
});

test("equal contributions: single main pot, all eligible", () => {
  const r = computeSidePots([
    p("A", 100, "active"),
    p("B", 100, "active"),
    p("C", 100, "active"),
  ]);
  assert.equal(r.pots.length, 1);
  assert.equal(r.pots[0].amount, 300);
  assert.deepEqual(r.pots[0].eligibleIds.sort(), ["A", "B", "C"]);
  assert.equal(r.refunds.length, 0);
});

test("one short-stack all-in: 2 pots", () => {
  // A all-in 100, B and C continue to 200
  const r = computeSidePots([
    p("A", 100, "all-in"),
    p("B", 200, "active"),
    p("C", 200, "active"),
  ]);
  assert.equal(r.pots.length, 2);
  // Pot 0: cap 100 → 100*3 = 300. All 3 eligible.
  assert.equal(r.pots[0].amount, 300);
  assert.deepEqual(r.pots[0].eligibleIds.sort(), ["A", "B", "C"]);
  // Pot 1: cap 200 → (200-100)*2 = 200. B,C eligible (A capped).
  assert.equal(r.pots[1].amount, 200);
  assert.deepEqual(r.pots[1].eligibleIds.sort(), ["B", "C"]);
  assert.equal(r.refunds.length, 0);
});

test("three-tier all-ins", () => {
  // A all-in 50, B all-in 150, C bets up to 200 (then no one can call further)
  const r = computeSidePots([
    p("A", 50, "all-in"),
    p("B", 150, "all-in"),
    p("C", 200, "active"),
  ]);
  // Levels: 50, 150, 200
  // Cap 50: 50+50+50 = 150, eligible: A,B,C
  // Cap 150: 0 + 100 + 100 = 200, eligible: B,C
  // Cap 200: 0 + 0 + 50 = 50, eligible: C only → uncontested
  assert.equal(r.pots.length, 3);
  assert.equal(r.pots[0].amount, 150);
  assert.deepEqual(r.pots[0].eligibleIds.sort(), ["A", "B", "C"]);
  assert.equal(r.pots[1].amount, 200);
  assert.deepEqual(r.pots[1].eligibleIds.sort(), ["B", "C"]);
  assert.equal(r.pots[2].amount, 50);
  assert.deepEqual(r.pots[2].eligibleIds, ["C"]);
  assert.equal(r.refunds.length, 0);
});

test("folded contributor still adds to pots, not eligible", () => {
  // A folds with 50 in pot, B and C continue to 200
  const r = computeSidePots([
    p("A", 50, "folded"),
    p("B", 200, "active"),
    p("C", 200, "active"),
  ]);
  // Cap 50: 50+50+50 = 150, eligible: B,C (A folded)
  // Cap 200: 0 + 150 + 150 = 300, eligible: B,C
  assert.equal(r.pots.length, 2);
  assert.equal(r.pots[0].amount, 150);
  assert.deepEqual(r.pots[0].eligibleIds.sort(), ["B", "C"]);
  assert.equal(r.pots[1].amount, 300);
  assert.deepEqual(r.pots[1].eligibleIds.sort(), ["B", "C"]);
  assert.equal(r.refunds.length, 0);
});

test("over-bettor folded: refund the uncovered top layer", () => {
  // A bet 300 then folded; B is the highest non-folded at 200; C folded at 50.
  const r = computeSidePots([
    p("A", 300, "folded"),
    p("B", 200, "all-in"),
    p("C", 50, "folded"),
  ]);
  // Cap 50: 50+50+50=150, eligible: B (A,C folded)
  // Cap 200: 0+150+150=300, eligible: B
  // Cap 300: 0+0+100=100, eligible: NONE → refund A 100
  assert.equal(r.pots.length, 2);
  assert.equal(r.pots[0].amount, 150);
  assert.deepEqual(r.pots[0].eligibleIds, ["B"]);
  assert.equal(r.pots[1].amount, 300);
  assert.deepEqual(r.pots[1].eligibleIds, ["B"]);
  assert.equal(r.refunds.length, 1);
  assert.deepEqual(r.refunds[0], { id: "A", amount: 100 });
});

test("uncalled bet between two non-folded: side pot uncontested", () => {
  // A bet 100, B all-in for 50.  No fold; both stay in.
  const r = computeSidePots([
    p("A", 100, "active"),
    p("B", 50, "all-in"),
  ]);
  // Cap 50: 50+50=100, eligible: A,B (showdown decides)
  // Cap 100: 50+0=50, eligible: A only → uncontested side pot for A
  assert.equal(r.pots.length, 2);
  assert.equal(r.pots[0].amount, 100);
  assert.deepEqual(r.pots[0].eligibleIds.sort(), ["A", "B"]);
  assert.equal(r.pots[1].amount, 50);
  assert.deepEqual(r.pots[1].eligibleIds, ["A"]);
  assert.equal(r.refunds.length, 0);
});

test("chip conservation: total pots + refunds = total contributions", () => {
  const players = [
    p("A", 50, "all-in"),
    p("B", 150, "folded"),
    p("C", 200, "active"),
    p("D", 200, "active"),
  ];
  const r = computeSidePots(players);
  const totalIn = players.reduce((s, x) => s + x.totalBet, 0);
  const totalPots = r.pots.reduce((s, x) => s + x.amount, 0);
  const totalRefunds = r.refunds.reduce((s, x) => s + x.amount, 0);
  assert.equal(totalPots + totalRefunds, totalIn);
});
