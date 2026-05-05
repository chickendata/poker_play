"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChipStack } from "@/components/atoms/ChipStack";
import { HoleCards } from "@/components/molecules/HoleCards";
import { cn } from "@/lib/utils";

export interface PlayerSeatData {
  id: string;
  name: string;
  chips: number;
  bet: number;
  status: string; // "active" | "folded" | "all-in" | "waiting"
  isYou?: boolean;
  isActive?: boolean;
  isDealer?: boolean;
  hasHoleCards: boolean;
  /** Set only for "you" — own face-up cards. */
  holeCards?: string[] | null;
  /** Public reveal of cards at showdown (for opponents). */
  revealedHole?: string[];
}

export function PlayerSeat({ player }: { player: PlayerSeatData }) {
  const isFolded = player.status === "folded";
  const isAllIn = player.status === "all-in";
  const isWaiting = player.status === "waiting" || player.status === "out";

  return (
    <div
      className={cn(
        "transition-all duration-300 flex flex-col items-center gap-1",
        player.isActive && "scale-110",
        isFolded && "opacity-40",
      )}
    >
      {/* Hole cards above the seat */}
      {player.hasHoleCards && (() => {
        const revealed =
          player.revealedHole && player.revealedHole.length === 2
            ? player.revealedHole
            : null;
        const ownCards = player.isYou ? player.holeCards : null;
        const visible = ownCards ?? revealed;
        return (
          <HoleCards
            cards={visible}
            faceDown={!visible}
            size="sm"
          />
        );
      })()}

      <div className="relative">
        {/* Seat */}
        <div
          className={cn(
            "w-32 h-32 rounded-full border-2 bg-gradient-to-br from-[#0f5f3f] to-[#0a3f2f] flex flex-col items-center justify-center shadow-lg shadow-[#00ff88]/20 backdrop-blur-sm",
            player.isActive ? "border-[#00ff88]" : "border-[#1a7f5f]",
          )}
        >
          <div className="text-sm font-semibold text-[#f5f5f5] mb-2 text-center px-2 truncate max-w-28">
            {player.name}
            {player.isYou && <span className="text-[#00ff88]"> (you)</span>}
          </div>

          <div className="mb-1">
            <ChipStack animated={player.isActive} />
          </div>

          <div
            className={cn(
              "text-xs font-bold text-center",
              player.isActive ? "text-[#00ff88] neon-text" : "text-[#00ff88]/70",
            )}
          >
            ${player.chips.toLocaleString()}
          </div>

          {isFolded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                Folded
              </span>
            </div>
          )}
          {isAllIn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-yellow-300 font-bold text-xs uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                All-in
              </span>
            </div>
          )}
          {isWaiting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                Waiting
              </span>
            </div>
          )}
        </div>

        {/* Active indicator ring */}
        {player.isActive && (
          <div className="absolute -inset-2 border-2 border-[#00ff88] rounded-full animate-pulse shadow-lg shadow-[#00ff88]/50 pointer-events-none" />
        )}

        {/* Dealer button badge */}
        {player.isDealer && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00cc66] flex items-center justify-center shadow border border-[#00ff88]">
            <span className="text-black font-bold text-xs">D</span>
          </div>
        )}
      </div>

      {/* Current bet displayed below seat */}
      <AnimatePresence>
        {player.bet > 0 && (
          <motion.div
            key="bet"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="px-2 py-0.5 rounded bg-black/60 border border-[#00ff88]/40 text-[#00ff88] text-xs font-mono"
          >
            ${player.bet.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
