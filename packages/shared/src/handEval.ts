import type { Card, Rank } from "./cards.js";

export const HAND_CATEGORIES = [
  "high_card",
  "pair",
  "two_pair",
  "three_of_a_kind",
  "straight",
  "flush",
  "full_house",
  "four_of_a_kind",
  "straight_flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];

export interface HandRank {
  /** 0=high_card .. 8=straight_flush */
  category: number;
  /** Tiebreaker tuple, descending importance. Compared lexicographically. */
  ranks: number[];
}

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

interface ParsedCard {
  v: number;
  s: string;
}

function parseCard(c: Card): ParsedCard {
  return { v: RANK_VALUE[c[0] as Rank], s: c[1] };
}

/** Evaluate exactly 5 cards into a HandRank. */
export function evaluate5(cards: readonly Card[]): HandRank {
  if (cards.length !== 5) {
    throw new Error(`evaluate5 requires 5 cards, got ${cards.length}`);
  }
  const parsed = cards.map(parseCard);
  const values = parsed.map((p) => p.v).sort((a, b) => b - a); // desc
  const suits = parsed.map((p) => p.s);

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  // sort by (count desc, rank desc)
  const grouped = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );

  const isFlush = suits.every((s) => s === suits[0]);

  // Straight detection on the 5 values
  const uniqueDesc = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqueDesc.length === 5) {
    if (uniqueDesc[0] - uniqueDesc[4] === 4) {
      straightHigh = uniqueDesc[0];
    } else if (
      uniqueDesc[0] === 14 &&
      uniqueDesc[1] === 5 &&
      uniqueDesc[2] === 4 &&
      uniqueDesc[3] === 3 &&
      uniqueDesc[4] === 2
    ) {
      // A-2-3-4-5 wheel; A counts as 1, so high card is 5
      straightHigh = 5;
    }
  }
  const isStraight = straightHigh > 0;

  // Combine
  if (isStraight && isFlush) {
    return { category: 8, ranks: [straightHigh] };
  }
  if (grouped[0][1] === 4) {
    // four of a kind
    const quad = grouped[0][0];
    const kicker = grouped[1][0];
    return { category: 7, ranks: [quad, kicker] };
  }
  if (grouped[0][1] === 3 && grouped[1][1] === 2) {
    return { category: 6, ranks: [grouped[0][0], grouped[1][0]] };
  }
  if (isFlush) {
    return { category: 5, ranks: values };
  }
  if (isStraight) {
    return { category: 4, ranks: [straightHigh] };
  }
  if (grouped[0][1] === 3) {
    const trips = grouped[0][0];
    const kickers = grouped.slice(1).map((g) => g[0]);
    return { category: 3, ranks: [trips, ...kickers] };
  }
  if (grouped[0][1] === 2 && grouped[1][1] === 2) {
    const high = Math.max(grouped[0][0], grouped[1][0]);
    const low = Math.min(grouped[0][0], grouped[1][0]);
    const kicker = grouped[2][0];
    return { category: 2, ranks: [high, low, kicker] };
  }
  if (grouped[0][1] === 2) {
    const pair = grouped[0][0];
    const kickers = grouped.slice(1).map((g) => g[0]);
    return { category: 1, ranks: [pair, ...kickers] };
  }
  return { category: 0, ranks: values };
}

/** Compare two HandRanks. Returns -1 if a<b, 0 if tie, 1 if a>b. */
export function compareHands(a: HandRank, b: HandRank): -1 | 0 | 1 {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i++) {
    const av = a.ranks[i] ?? 0;
    const bv = b.ranks[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

/** All k-combinations of the input array. */
function combinations<T>(arr: readonly T[], k: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    result.push(idx.map((i) => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === i + n - k) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return result;
}

/** Find the best 5-card HandRank among any 5..7 cards (typically 7: 2 hole + 5 community). */
export function evaluateBest(cards: readonly Card[]): HandRank {
  if (cards.length < 5) {
    throw new Error(`evaluateBest needs at least 5 cards, got ${cards.length}`);
  }
  if (cards.length === 5) return evaluate5(cards);
  let best: HandRank | null = null;
  for (const combo of combinations(cards, 5)) {
    const r = evaluate5(combo);
    if (!best || compareHands(r, best) === 1) best = r;
  }
  return best!;
}

/**
 * Group player IDs by tied hand strength, ordered best → worst.
 * Used at showdown to award the pot (or split among ties).
 */
export function rankShowdown(
  hands: readonly { id: string; cards: readonly Card[] }[],
): { ids: string[]; rank: HandRank }[] {
  const evaluated = hands.map((h) => ({
    id: h.id,
    rank: evaluateBest(h.cards),
  }));
  // Bucket by rank equality
  const buckets: { ids: string[]; rank: HandRank }[] = [];
  for (const e of evaluated) {
    const b = buckets.find((x) => compareHands(x.rank, e.rank) === 0);
    if (b) b.ids.push(e.id);
    else buckets.push({ ids: [e.id], rank: e.rank });
  }
  buckets.sort((a, b) => compareHands(b.rank, a.rank));
  return buckets;
}

export function categoryName(rank: HandRank): HandCategory {
  return HAND_CATEGORIES[rank.category];
}
