import {
  evaluateBest,
  type Action,
  type Card,
  type GameState,
} from "@poker/shared";

const RANK_VALUE: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * Rough preflop strength score in [0, 1].
 * Simplified Chen-like formula: pairs strong, high cards strong, suited/connected bonus.
 */
function preflopStrength(hole: [Card, Card]): number {
  const r1 = RANK_VALUE[hole[0][0]];
  const r2 = RANK_VALUE[hole[1][0]];
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);
  const pair = r1 === r2;
  const suited = hole[0][1] === hole[1][1];

  if (pair) {
    if (high >= 11) return 0.95;
    if (high >= 8) return 0.8;
    if (high >= 5) return 0.65;
    return 0.5;
  }

  let score = (high + low) / 32; // baseline ~0.13..0.87
  if (suited) score += 0.08;
  const gap = high - low;
  if (gap === 1) score += 0.08;
  else if (gap === 2) score += 0.04;
  else if (gap >= 5) score -= 0.06;
  if (high === 14) score += 0.06;
  if (high >= 12 && low >= 10) score += 0.05;

  return Math.max(0.05, Math.min(0.95, score));
}

/** Map post-flop hand category (0..8) to a normalized strength in [0, 1]. */
function postflopStrength(hole: [Card, Card], community: readonly Card[]): number {
  const rank = evaluateBest([...hole, ...community]);
  // category: 0=high_card .. 8=straight_flush
  const base = rank.category / 8;
  // Boost a little by top kicker (max 14)
  const kicker = (rank.ranks[0] ?? 0) / 14;
  return Math.max(0.05, Math.min(0.98, base + kicker * 0.05));
}

function strengthFor(state: GameState, hole: [Card, Card]): number {
  if (state.stage === "preflop") return preflopStrength(hole);
  return postflopStrength(hole, state.community);
}

/**
 * Decide a single legal action for the bot whose turn it is.
 * Caller ensures it's actually the bot's turn and the bot is "active".
 */
export function decideBotAction(state: GameState, botId: string): Action {
  const me = state.players.find((p) => p.id === botId);
  if (!me || !me.hole) return { type: "fold" };

  const strength = strengthFor(state, me.hole);
  const owed = state.currentBet - me.bet;
  const r = Math.random();

  // No bet to call: check or take initiative
  if (owed === 0) {
    if (strength > 0.75 && r < 0.7) {
      // Strong: bet ~60% of pot, clamped to min/max
      const target = Math.max(
        state.bigBlind,
        Math.min(Math.floor(state.pot * 0.6) || state.bigBlind, me.chips),
      );
      if (target <= me.chips && target >= state.bigBlind) {
        return { type: "bet", amount: target };
      }
    }
    if (strength > 0.5 && r < 0.2) {
      const target = Math.min(state.bigBlind * 2, me.chips);
      if (target >= state.bigBlind) return { type: "bet", amount: target };
    }
    return { type: "check" };
  }

  // Facing a bet
  const potOdds = owed / (state.pot + owed); // chips needed / total after we call

  // Strong: raise or call
  if (strength > 0.8) {
    if (r < 0.5) {
      const target = state.currentBet + Math.max(state.minRaise, state.bigBlind * 2);
      const owedToRaise = target - me.bet;
      if (owedToRaise <= me.chips && target >= state.currentBet + state.minRaise) {
        return { type: "raise", amount: target };
      }
    }
    return owed <= me.chips ? { type: "call" } : { type: "fold" };
  }

  // Medium: call if pot odds are OK
  if (strength > 0.55) {
    if (potOdds < 0.4 || r < 0.6) {
      return owed <= me.chips ? { type: "call" } : { type: "fold" };
    }
    return { type: "fold" };
  }

  // Marginal: call only cheap, fold otherwise
  if (strength > 0.35) {
    if (potOdds < 0.2 && r < 0.5) {
      return owed <= me.chips ? { type: "call" } : { type: "fold" };
    }
    return { type: "fold" };
  }

  // Weak: fold, with a tiny bluff-call to avoid being predictable
  if (potOdds < 0.1 && r < 0.25) {
    return owed <= me.chips ? { type: "call" } : { type: "fold" };
  }
  return { type: "fold" };
}
