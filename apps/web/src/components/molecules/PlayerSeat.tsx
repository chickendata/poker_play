"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChipStack } from "@/components/atoms/ChipStack";
import { HoleCards } from "@/components/molecules/HoleCards";
import { cn, formatChips } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export interface PlayerSeatData {
  id: string;
  name: string;
  chips: number;
  bet: number;
  status: string; // "active" | "folded" | "all-in" | "waiting"
  isYou?: boolean;
  isActive?: boolean;
  isDealer?: boolean;
  /** AI player added by the room host. */
  isBot?: boolean;
  hasHoleCards: boolean;
  /** Set only for "you" — own face-up cards. */
  holeCards?: string[] | null;
  /** Public reveal of cards at showdown (for opponents). */
  revealedHole?: string[];
  /** Hand category at showdown (e.g. "two_pair"). */
  revealedCategory?: string;
  /** True if this player won the hand (highlights showdown label). */
  isWinner?: boolean;
  /** Epoch ms when this player's turn auto-folds. 0/undef when not their turn. */
  turnDeadline?: number;
  /** Total turn duration in ms — used to compute the progress ring fill. */
  turnTotalMs?: number;
}


export function PlayerSeat({ player }: { player: PlayerSeatData }) {
  const t = useT();
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
        const showdownLabel =
          revealed && player.revealedCategory
            ? t(`hand.${player.revealedCategory}`)
            : null;
        return (
          <div className="flex flex-col items-center gap-1">
            <HoleCards
              cards={visible}
              faceDown={!visible}
              size="sm"
            />
            {showdownLabel && (
              <motion.div
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                  player.isWinner
                    ? "bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] neon-text"
                    : "bg-black/60 border-white/20 text-gray-300",
                )}
              >
                {showdownLabel}
              </motion.div>
            )}
          </div>
        );
      })()}

      <div className="relative">
        {/* BOT badge (top of avatar) */}
        {player.isBot && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded bg-[#9966ff] text-black text-[8px] sm:text-[10px] font-bold uppercase tracking-wider shadow shadow-[#9966ff]/50">
            {t("seat.bot")}
          </div>
        )}
        {/* Seat */}
        <div
          className={cn(
            "w-20 h-20 sm:w-32 sm:h-32 rounded-full border-2 bg-gradient-to-br from-[#0f5f3f] to-[#0a3f2f] flex flex-col items-center justify-center shadow-lg shadow-[#00ff88]/20 backdrop-blur-sm",
            player.isActive
              ? "border-[#00ff88]"
              : player.isBot
                ? "border-[#9966ff]/70"
                : "border-[#1a7f5f]",
          )}
        >
          <div className="text-[10px] sm:text-sm font-semibold text-[#f5f5f5] mb-1 sm:mb-2 text-center px-1 sm:px-2 truncate max-w-[72px] sm:max-w-28">
            {player.name}
            {player.isYou && <span className="text-[#00ff88]">{t("seat.you")}</span>}
          </div>

          <div className="mb-1 hidden sm:block">
            <ChipStack animated={player.isActive} />
          </div>

          <div
            className={cn(
              "text-[10px] sm:text-xs font-bold text-center",
              player.isActive ? "text-[#00ff88] neon-text" : "text-[#00ff88]/70",
            )}
          >
            ${formatChips(player.chips)}
          </div>

          {isFolded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                {t("seat.folded")}
              </span>
            </div>
          )}
          {isAllIn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-yellow-300 font-bold text-xs uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                {t("seat.allIn")}
              </span>
            </div>
          )}
          {isWaiting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                {t("seat.waiting")}
              </span>
            </div>
          )}
        </div>

        {/* Active indicator ring */}
        {player.isActive && (
          <div className="absolute -inset-2 border-2 border-[#00ff88] rounded-full animate-pulse shadow-lg shadow-[#00ff88]/50 pointer-events-none" />
        )}

        {/* Turn countdown ring */}
        {player.isActive && !!player.turnDeadline && player.turnDeadline > 0 && (
          <TurnCountdownRing
            deadline={player.turnDeadline}
            totalMs={player.turnTotalMs ?? 30_000}
          />
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
            ${formatChips(player.bet)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Circular SVG ring around the active seat that drains as the action timer ticks down. */
function TurnCountdownRing({
  deadline,
  totalMs,
}: {
  deadline: number;
  totalMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() < deadline) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deadline]);

  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));

  // Ring geometry: outer ring sits just outside the seat (-inset-2 → ~144px box).
  const size = 144;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - progress);

  // Color shifts as time runs out: green → yellow → red.
  const color =
    remainingSec <= 5
      ? "#ef4444"
      : remainingSec <= 10
        ? "#facc15"
        : "#00ff88";

  return (
    <svg
      className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] pointer-events-none"
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={stroke}
      />
      {/* Drain ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke 0.3s" }}
      />
    </svg>
  );
}
