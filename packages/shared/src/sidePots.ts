/**
 * Side-pot construction for Texas Hold'em.
 *
 * When players go all-in for unequal amounts, the chips form a series of
 * "layered" pots. Each player can only win a pot they fully matched.
 *
 * Algorithm (layer by layer, ascending all-in caps):
 *   For each cap level L (= a player's totalBet):
 *     amount = sum over all players of max(0, min(totalBet, L) - prevLevel)
 *     eligible = non-folded players whose totalBet >= L
 *     if eligible is empty → refund the contributors of this layer
 *       (only happens when the over-bettor folded above the highest non-folded cap)
 *
 * NOTE: this function does NOT need engine internals — it works on any object
 * shaped { id, totalBet, status }. Tests use plain objects.
 */

export interface SidePot {
  amount: number;
  /** Players who can win this pot (non-folded with totalBet >= cap). */
  eligibleIds: string[];
}

export interface Refund {
  id: string;
  amount: number;
}

export interface SidePotsResult {
  pots: SidePot[];
  refunds: Refund[];
}

interface Contributor {
  id: string;
  totalBet: number;
  /** Treated as folded if status === "folded". Anything else (active, all-in) is a contender. */
  status: string;
}

export function computeSidePots(
  players: readonly Contributor[],
): SidePotsResult {
  const totalBets = players.map((p) => p.totalBet).filter((b) => b > 0);
  const levels = [...new Set(totalBets)].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  const refundMap = new Map<string, number>();
  let prev = 0;

  for (const level of levels) {
    const layerWidth = level - prev;
    const layerContribs = players
      .map((p) => ({
        id: p.id,
        contrib: Math.max(0, Math.min(p.totalBet, level) - prev),
      }))
      .filter((x) => x.contrib > 0);

    const amount = layerContribs.reduce((s, x) => s + x.contrib, 0);
    if (amount > 0) {
      const eligibleIds = players
        .filter((p) => p.status !== "folded" && p.totalBet >= level)
        .map((p) => p.id);

      if (eligibleIds.length > 0) {
        pots.push({ amount, eligibleIds });
      } else {
        // No eligible winner for this layer → refund contributors proportionally.
        for (const c of layerContribs) {
          refundMap.set(c.id, (refundMap.get(c.id) ?? 0) + c.contrib);
        }
      }
    }
    void layerWidth; // (kept for readability)
    prev = level;
  }

  const refunds: Refund[] = [...refundMap.entries()].map(([id, amount]) => ({
    id,
    amount,
  }));
  return { pots, refunds };
}
