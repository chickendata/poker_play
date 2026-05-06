"use client";

import { useEffect, useRef, useState } from "react";
import {
  PlayerSeat,
  type PlayerSeatData,
} from "@/components/molecules/PlayerSeat";
import { CommunityCards } from "@/components/molecules/CommunityCards";
import { PotDisplay } from "@/components/molecules/PotDisplay";
import { NeonCorners } from "@/components/atoms/NeonCorners";
import {
  DealAnimation,
  dealAnimationDurationMs,
} from "@/components/molecules/DealAnimation";

export interface PokerTablePlayer extends PlayerSeatData {
  seat: number;
}

/**
 * Per-seat positioning: tighter offsets on mobile, more breathing room on desktop.
 * The seat itself shrinks via responsive classes inside PlayerSeat.
 */
const SEAT_POSITIONS_6 = [
  "top-6 left-1 sm:top-16 sm:left-12",
  "top-1 left-1/2 -translate-x-1/2 sm:top-2",
  "top-6 right-1 sm:top-16 sm:right-12",
  "bottom-6 right-1 sm:bottom-16 sm:right-12",
  "bottom-1 left-1/2 -translate-x-1/2 sm:bottom-2",
  "bottom-6 left-1 sm:bottom-16 sm:left-12",
];

export function PokerTable({
  players,
  pot,
  community,
  sidePots,
  stage,
  dealerSeat,
}: {
  players: PokerTablePlayer[];
  pot: number;
  community: string[];
  sidePots?: { amount: number }[];
  /** Game stage; transitions into "preflop" trigger the deal animation. */
  stage?: string;
  /** Seat of the current dealer button — animation origin. */
  dealerSeat?: number;
}) {
  // Trigger the deal-cards overlay every time a new hand starts.
  const [dealing, setDealing] = useState(false);
  const [dealNonce, setDealNonce] = useState(0);
  const prevStageRef = useRef<string | undefined>(stage);

  useEffect(() => {
    const prev = prevStageRef.current;
    prevStageRef.current = stage;
    if (stage !== "preflop" || prev === "preflop") return;

    // New hand started — kick off the deal animation. Duration scales with
    // player count so all cards finish landing before we reveal the real ones.
    const playerCount = players.filter((p) => p.hasHoleCards).length;
    if (playerCount < 2) return;

    setDealNonce((n) => n + 1);
    setDealing(true);
    const duration = dealAnimationDurationMs(playerCount);
    const timer = setTimeout(() => setDealing(false), duration);
    return () => clearTimeout(timer);
    // We deliberately depend only on `stage` — `players` updates would otherwise
    // re-fire while the deal is in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Build the dealing order: clockwise from (dealer + 1), seats that have cards.
  const seatedSeats = (() => {
    if (dealerSeat === undefined || dealerSeat < 0) return [];
    const allSeats = players
      .filter((p) => p.hasHoleCards)
      .map((p) => p.seat)
      .sort((a, b) => a - b);
    if (allSeats.length === 0) return [];
    const ordered: number[] = [];
    for (let i = 0; i < allSeats.length; i++) {
      const idx = (dealerSeat + 1 + i) % 6;
      // pick the next seat at or after `idx` clockwise that's actually seated
      let pick = -1;
      for (let j = 0; j < 6; j++) {
        const candidate = (idx + j) % 6;
        if (allSeats.includes(candidate) && !ordered.includes(candidate)) {
          pick = candidate;
          break;
        }
      }
      if (pick !== -1) ordered.push(pick);
    }
    return ordered;
  })();

  return (
    <div className="relative w-full max-w-6xl aspect-[5/4] sm:aspect-video bg-black rounded-[40%] sm:rounded-full shadow-2xl border-2 sm:border-4 border-[#00ff88] felt-shine">
      {/* Center: community cards + pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 sm:gap-3">
        <CommunityCards cards={community} />
        <PotDisplay total={pot} sidePots={sidePots} />
      </div>

      {/* Players in seats — hole cards are suppressed during the deal animation. */}
      {players.map((p) => {
        const pos = SEAT_POSITIONS_6[p.seat] ?? SEAT_POSITIONS_6[0];
        return (
          <div key={p.id} className={`absolute ${pos}`}>
            <PlayerSeat player={{ ...p, hasHoleCards: dealing ? false : p.hasHoleCards }} />
          </div>
        );
      })}

      {/* Deal-cards overlay */}
      {dealing && dealerSeat !== undefined && dealerSeat >= 0 && (
        <DealAnimation
          dealerSeat={dealerSeat}
          seatedSeats={seatedSeats}
          nonce={dealNonce}
        />
      )}

      <NeonCorners />
    </div>
  );
}
