"use client";

import {
  PlayerSeat,
  type PlayerSeatData,
} from "@/components/molecules/PlayerSeat";
import { CommunityCards } from "@/components/molecules/CommunityCards";
import { PotDisplay } from "@/components/molecules/PotDisplay";
import { NeonCorners } from "@/components/atoms/NeonCorners";

export interface PokerTablePlayer extends PlayerSeatData {
  seat: number;
}

const SEAT_POSITIONS_6 = [
  "top-16 left-12",
  "top-2 left-1/2 -translate-x-1/2",
  "top-16 right-12",
  "bottom-16 right-12",
  "bottom-2 left-1/2 -translate-x-1/2",
  "bottom-16 left-12",
];

export function PokerTable({
  players,
  pot,
  community,
  sidePots,
}: {
  players: PokerTablePlayer[];
  pot: number;
  community: string[];
  sidePots?: { amount: number }[];
}) {
  return (
    <div className="relative w-full max-w-6xl aspect-video bg-black rounded-full shadow-2xl border-4 border-[#00ff88] felt-shine">
      {/* Center: community cards + pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        <CommunityCards cards={community} />
        <PotDisplay total={pot} sidePots={sidePots} />
      </div>

      {/* Players in seats */}
      {players.map((p) => {
        const pos = SEAT_POSITIONS_6[p.seat] ?? SEAT_POSITIONS_6[0];
        return (
          <div key={p.id} className={`absolute ${pos}`}>
            <PlayerSeat player={p} />
          </div>
        );
      })}

      <NeonCorners />
    </div>
  );
}
