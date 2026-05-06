"use client";

import { useEffect, useState } from "react";
import { cn, formatChips } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export interface ActionBarProps {
  /** Chips you have left to put in the pot. */
  chips: number;
  /** Amount you've already committed this round. */
  myBet: number;
  /** Largest bet on the table this round. */
  currentBet: number;
  /** Min raise increment (from engine). */
  minRaise: number;
  bigBlind: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  /** When currentBet === 0, called with the absolute bet amount. */
  onBet: (amount: number) => void;
  /** When currentBet > 0, called with the absolute target bet amount. */
  onRaise: (amount: number) => void;
}

export function ActionBar(props: ActionBarProps) {
  const t = useT();
  const {
    chips,
    myBet,
    currentBet,
    minRaise,
    bigBlind,
    onFold,
    onCheck,
    onCall,
    onBet,
    onRaise,
  } = props;

  const owed = Math.max(0, currentBet - myBet);
  const canCheck = owed === 0;
  const canCall = owed > 0 && chips >= owed;
  const isBet = currentBet === 0;
  const minTarget = isBet
    ? Math.min(bigBlind, chips + myBet)
    : Math.min(currentBet + minRaise, chips + myBet);
  const maxTarget = chips + myBet; // all-in target

  const [target, setTarget] = useState<number>(minTarget);

  useEffect(() => {
    setTarget(Math.max(minTarget, Math.min(target, maxTarget)));
    // we intentionally only re-clamp when bounds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTarget, maxTarget]);

  const canRaise = chips > owed && minTarget <= maxTarget;

  return (
    <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-3 sm:p-4 shadow-lg shadow-[#00ff88]/30 flex flex-col gap-2 sm:gap-3 w-full sm:min-w-[320px] sm:w-auto">
      <div className="text-[#00ff88] font-bold text-xs sm:text-sm uppercase tracking-wider neon-text">
        {t("action.title")}
      </div>

      <div className="flex gap-2">
        <ActionButton onClick={onFold} variant="danger">
          {t("action.fold")}
        </ActionButton>

        {canCheck ? (
          <ActionButton onClick={onCheck} variant="neutral">
            {t("action.check")}
          </ActionButton>
        ) : (
          <ActionButton
            onClick={onCall}
            disabled={!canCall}
            variant="primary"
          >
            {t("action.call", { amount: formatChips(owed) })}
            {!canCall && ` ${t("action.insufficient")}`}
          </ActionButton>
        )}

        <ActionButton
          onClick={() => (isBet ? onBet(target) : onRaise(target))}
          disabled={!canRaise}
          variant="primary"
        >
          {isBet ? t("action.bet") : t("action.raiseTo")} ${formatChips(target)}
          {target === maxTarget && ` ${t("action.allIn")}`}
        </ActionButton>
      </div>

      {canRaise && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={minTarget}
            max={maxTarget}
            step={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="flex-1 accent-[#00ff88]"
          />
          <input
            type="number"
            value={target}
            min={minTarget}
            max={maxTarget}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) {
                setTarget(Math.max(minTarget, Math.min(v, maxTarget)));
              }
            }}
            className="w-24 bg-black border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm text-right focus:border-[#00ff88] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "neutral" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 px-2 sm:px-3 py-2 rounded font-bold text-xs sm:text-sm transition-all",
        disabled && "opacity-40 cursor-not-allowed",
        variant === "primary" &&
          "bg-[#00ff88] text-black hover:shadow-lg hover:shadow-[#00ff88]/50",
        variant === "neutral" &&
          "bg-[#2a2a2a] text-white border border-[#00ff88] hover:bg-[#00ff88]/10",
        variant === "danger" &&
          "bg-[#ff0055] text-white hover:shadow-lg hover:shadow-[#ff0055]/50",
      )}
    >
      {children}
    </button>
  );
}
