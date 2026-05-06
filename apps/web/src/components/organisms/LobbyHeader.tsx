"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { BalanceCard } from "@/components/molecules/BalanceCard";
import { NeonText } from "@/components/atoms/NeonText";
import { useT } from "@/i18n/LocaleContext";

export function LobbyHeader({
  username,
  balance,
  onOpenSettings,
}: {
  username: string;
  balance: number;
  onOpenSettings?: () => void;
}) {
  const t = useT();
  return (
    <header className="border-b border-[#1a7f5f] bg-gradient-to-b from-[#0f5f3f] to-black p-4 sm:p-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <NeonText as="h1" className="text-2xl sm:text-4xl font-bold">
            {`>`}POKER_LOBBY
          </NeonText>
          <p className="text-[#00ff88] text-xs sm:text-sm mt-1">
            {t("lobby.welcome", { name: username })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BalanceCard balance={balance} />
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded border border-[#1a7f5f] text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88] transition-colors"
              aria-label={t("common.settings")}
              title={t("common.settings")}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
