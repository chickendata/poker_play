"use client";

import { Zap } from "lucide-react";
import { GameStatusBadge } from "@/components/atoms/GameStatusBadge";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export interface GameRow {
  id: string;
  name: string;
  blinds: string;
  players: number;
  maxPlayers: number;
  buyIn: string;
  status: "open" | "running";
  avgPot: string;
}

export function GameList({
  games,
  selectedId,
  onSelect,
  onJoin,
}: {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onJoin: (id: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#00ff88] mb-4 flex items-center gap-2">
        <Zap className="w-6 h-6" />
        {t("lobby.availableGames")}
      </h2>
      <div className="space-y-3">
        {games.length === 0 && (
          <div className="border border-[#2a2a2a] rounded-lg p-8 text-center text-gray-500">
            {t("lobby.noGames")}
          </div>
        )}
        {games.map((g) => {
          const full = g.players >= g.maxPlayers;
          return (
            <div
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                selectedId === g.id
                  ? "bg-[#1a7f5f] border-[#00ff88] neon-border"
                  : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#00ff88]",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{g.name}</h3>
                    <GameStatusBadge status={g.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Cell label={t("lobby.blinds")} value={g.blinds} />
                    <Cell
                      label={t("lobby.players")}
                      value={`${g.players}/${g.maxPlayers}`}
                    />
                    <Cell label={t("lobby.buyIn")} value={g.buyIn} />
                    <Cell label={t("lobby.avgPot")} value={g.avgPot} />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!full) onJoin(g.id);
                  }}
                  disabled={full}
                  className={cn(
                    "px-4 py-2 rounded font-semibold transition-all ml-4",
                    full
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-[#00ff88] text-black hover:shadow-lg hover:shadow-[#00ff88]/50 active:scale-95",
                  )}
                >
                  {full ? t("lobby.full") : t("lobby.join")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-[#00ff88] font-mono">{value}</p>
    </div>
  );
}
