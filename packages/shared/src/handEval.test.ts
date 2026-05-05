import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "./cards.js";
import {
  evaluate5,
  evaluateBest,
  compareHands,
  rankShowdown,
  HAND_CATEGORIES,
} from "./handEval.js";

const cat = (name: (typeof HAND_CATEGORIES)[number]) =>
  HAND_CATEGORIES.indexOf(name);

const h = (...c: string[]) => c as Card[];

test("evaluate5: high card", () => {
  const r = evaluate5(h("Ah", "Kd", "9c", "5s", "2h"));
  assert.equal(r.category, cat("high_card"));
  assert.deepEqual(r.ranks, [14, 13, 9, 5, 2]);
});

test("evaluate5: pair", () => {
  const r = evaluate5(h("Ah", "Ad", "9c", "5s", "2h"));
  assert.equal(r.category, cat("pair"));
  assert.deepEqual(r.ranks, [14, 9, 5, 2]);
});

test("evaluate5: two pair (high pair leads)", () => {
  const r = evaluate5(h("Ah", "Ad", "9c", "9s", "2h"));
  assert.equal(r.category, cat("two_pair"));
  assert.deepEqual(r.ranks, [14, 9, 2]);
});

test("evaluate5: three of a kind", () => {
  const r = evaluate5(h("Kh", "Kd", "Kc", "9s", "2h"));
  assert.equal(r.category, cat("three_of_a_kind"));
  assert.deepEqual(r.ranks, [13, 9, 2]);
});

test("evaluate5: straight (T-high)", () => {
  const r = evaluate5(h("Th", "9d", "8c", "7s", "6h"));
  assert.equal(r.category, cat("straight"));
  assert.deepEqual(r.ranks, [10]);
});

test("evaluate5: wheel straight (A-2-3-4-5, high=5)", () => {
  const r = evaluate5(h("Ah", "2d", "3c", "4s", "5h"));
  assert.equal(r.category, cat("straight"));
  assert.deepEqual(r.ranks, [5]);
});

test("evaluate5: broadway straight (T-J-Q-K-A, high=14)", () => {
  const r = evaluate5(h("Th", "Jd", "Qc", "Ks", "Ah"));
  assert.equal(r.category, cat("straight"));
  assert.deepEqual(r.ranks, [14]);
});

test("evaluate5: flush", () => {
  const r = evaluate5(h("Ah", "Jh", "9h", "5h", "2h"));
  assert.equal(r.category, cat("flush"));
  assert.deepEqual(r.ranks, [14, 11, 9, 5, 2]);
});

test("evaluate5: full house (trips first, then pair)", () => {
  const r = evaluate5(h("Kh", "Kd", "Kc", "9s", "9h"));
  assert.equal(r.category, cat("full_house"));
  assert.deepEqual(r.ranks, [13, 9]);
});

test("evaluate5: four of a kind", () => {
  const r = evaluate5(h("Qh", "Qd", "Qc", "Qs", "9h"));
  assert.equal(r.category, cat("four_of_a_kind"));
  assert.deepEqual(r.ranks, [12, 9]);
});

test("evaluate5: straight flush", () => {
  const r = evaluate5(h("9h", "8h", "7h", "6h", "5h"));
  assert.equal(r.category, cat("straight_flush"));
  assert.deepEqual(r.ranks, [9]);
});

test("evaluate5: royal flush is just straight flush A-high", () => {
  const r = evaluate5(h("Th", "Jh", "Qh", "Kh", "Ah"));
  assert.equal(r.category, cat("straight_flush"));
  assert.deepEqual(r.ranks, [14]);
});

test("evaluate5: wheel straight flush (A-2-3-4-5 suited, high=5)", () => {
  const r = evaluate5(h("As", "2s", "3s", "4s", "5s"));
  assert.equal(r.category, cat("straight_flush"));
  assert.deepEqual(r.ranks, [5]);
});

test("compareHands: pair beats high card", () => {
  const lo = evaluate5(h("Ah", "Kd", "9c", "5s", "2h")); // A-high
  const hi = evaluate5(h("2h", "2d", "9c", "5s", "3h")); // pair of 2s
  assert.equal(compareHands(hi, lo), 1);
  assert.equal(compareHands(lo, hi), -1);
});

test("compareHands: same pair, kicker decides", () => {
  const a = evaluate5(h("Kh", "Kd", "Ah", "5s", "2h")); // KK + A kicker
  const b = evaluate5(h("Kc", "Ks", "Qh", "5d", "2c")); // KK + Q kicker
  assert.equal(compareHands(a, b), 1);
});

test("compareHands: flush beats straight", () => {
  const fl = evaluate5(h("Ah", "Jh", "9h", "5h", "2h"));
  const st = evaluate5(h("Th", "9d", "8c", "7s", "6h"));
  assert.equal(compareHands(fl, st), 1);
});

test("compareHands: tie returns 0", () => {
  const a = evaluate5(h("Kh", "Kd", "Ah", "5s", "2h"));
  const b = evaluate5(h("Kc", "Ks", "Ad", "5h", "2c"));
  assert.equal(compareHands(a, b), 0);
});

test("evaluateBest: picks straight from 7 cards", () => {
  // hole: As Ks  community: Qd Jh Th 2c 3s  → broadway straight T-A
  const r = evaluateBest(h("As", "Ks", "Qd", "Jh", "Th", "2c", "3s"));
  assert.equal(r.category, cat("straight"));
  assert.deepEqual(r.ranks, [14]);
});

test("evaluateBest: picks flush over pair when both available", () => {
  // hole: Ah Kh community: 9h 5h 2h 9c 9d
  // could play full house (999 + Kx) — wait, no pair on board with hole
  // actually 9h 9c 9d is trips on board + Ah/Kh hole → trips with Ah Kh kickers
  // OR Ah Kh 9h 5h 2h flush
  // Flush (cat 5) beats trips (cat 3)
  const r = evaluateBest(h("Ah", "Kh", "9h", "5h", "2h", "9c", "9d"));
  assert.equal(r.category, cat("flush"));
  assert.deepEqual(r.ranks, [14, 13, 9, 5, 2]);
});

test("evaluateBest: picks full house over flush when both available", () => {
  // hole: 9h 9c  community: 9d Kh Qh Jh Th
  // 999 + KK? no — only one K. trips 9 + KQ kickers → trips with KQ
  // OR straight T-J-Q-K-A? no A. T-J-Q-K + 9 → straight K-high (10,J,Q,K,9? not consecutive)
  // Actually T,J,Q,K need 9 or A to complete → 9 completes to 9-T-J-Q-K straight, K-high
  // OR flush hearts: Kh Qh Jh Th + need 1 more heart from hole — 9c 9h, only 9h
  //   → Kh Qh Jh Th 9h = straight flush K-high!
  // So best = straight flush
  const r = evaluateBest(h("9h", "9c", "9d", "Kh", "Qh", "Jh", "Th"));
  assert.equal(r.category, cat("straight_flush"));
  assert.deepEqual(r.ranks, [13]);
});

test("rankShowdown: orders winners best→worst, groups ties", () => {
  // P1: pair of A
  // P2: pair of A (different suits, same kickers — exact tie)
  // P3: pair of K
  const buckets = rankShowdown([
    { id: "P1", cards: h("Ah", "Ad", "9c", "5s", "2h") },
    { id: "P2", cards: h("As", "Ac", "9h", "5d", "2c") },
    { id: "P3", cards: h("Kh", "Kd", "9c", "5s", "2h") },
  ]);
  assert.equal(buckets.length, 2);
  assert.deepEqual(buckets[0].ids.sort(), ["P1", "P2"]);
  assert.deepEqual(buckets[1].ids, ["P3"]);
});
