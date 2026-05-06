"use client";

import { motion } from "framer-motion";
import { CardBack } from "@/components/atoms/PlayingCard";

/**
 * Approximate "hole-cards" position for each seat as a percentage of the table
 * box. Slightly offset from the visual seat circle to land where the actual
 * hole cards appear above the seat. Tuned by eye against SEAT_POSITIONS_6.
 */
const SEAT_DEAL_POSITIONS: { top: number; left: number }[] = [
  { top: 22, left: 14 }, // 0: top-left
  { top: 14, left: 50 }, // 1: top-center
  { top: 22, left: 86 }, // 2: top-right
  { top: 70, left: 86 }, // 3: bottom-right
  { top: 78, left: 50 }, // 4: bottom-center
  { top: 70, left: 14 }, // 5: bottom-left
];

/** Fly-time for a single card from deck → seat. */
const FLIGHT_DURATION_S = 0.5;
/** Delay between consecutive card deals. */
const STAGGER_S = 0.1;

export interface DealAnimationProps {
  dealerSeat: number;
  /** Seats (in clockwise dealing order) that should receive cards. */
  seatedSeats: number[];
  /** A nonce that, when changed, triggers a fresh deal animation. */
  nonce: number;
}

/**
 * Total time the deal animation takes for the given player count, in ms.
 * Useful for callers that need to delay revealing the real hole cards until
 * after the deal finishes.
 */
export function dealAnimationDurationMs(playerCount: number): number {
  // 2 cards per player, then a final settle pause.
  const cardCount = playerCount * 2;
  const lastDealStart = (cardCount - 1) * STAGGER_S;
  return Math.round((lastDealStart + FLIGHT_DURATION_S + 0.15) * 1000);
}

export function DealAnimation({
  dealerSeat,
  seatedSeats,
  nonce,
}: DealAnimationProps) {
  // Build deal sequence: 2 rounds × N players, dealing left-of-dealer first.
  // `seatedSeats` is already clockwise from (dealer+1).
  const sequence: { targetSeat: number; round: number }[] = [];
  for (let round = 0; round < 2; round++) {
    for (const seat of seatedSeats) {
      sequence.push({ targetSeat: seat, round });
    }
  }

  const from =
    SEAT_DEAL_POSITIONS[dealerSeat] ?? { top: 50, left: 50 };

  return (
    <div
      key={nonce}
      className="absolute inset-0 pointer-events-none z-20"
    >
      {sequence.map((c, i) => {
        const to =
          SEAT_DEAL_POSITIONS[c.targetSeat] ?? { top: 50, left: 50 };
        return (
          <motion.div
            key={`${nonce}-${i}`}
            className="absolute"
            style={{
              top: `${from.top}%`,
              left: `${from.left}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{
              top: `${from.top}%`,
              left: `${from.left}%`,
              opacity: 0,
              scale: 0.7,
              rotate: -25,
            }}
            animate={{
              top: [`${from.top}%`, `${to.top}%`, `${to.top}%`],
              left: [`${from.left}%`, `${to.left}%`, `${to.left}%`],
              opacity: [0, 1, 1, 0],
              scale: [0.7, 1, 1, 0.95],
              rotate: [-25, 8, 0, 0],
            }}
            transition={{
              duration: FLIGHT_DURATION_S + 0.25,
              times: [0, 0.55, 0.85, 1],
              delay: i * STAGGER_S,
              ease: "easeOut",
            }}
          >
            <CardBack size="sm" />
          </motion.div>
        );
      })}
    </div>
  );
}
