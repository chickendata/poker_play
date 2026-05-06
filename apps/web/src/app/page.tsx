"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyHeader } from "@/components/organisms/LobbyHeader";
import {
  GameList,
  type GameRow,
} from "@/components/organisms/GameList";
import { PlayerStatsPanel } from "@/components/organisms/PlayerStatsPanel";
import {
  CreatePrivateRoomDialog,
  type CreatePrivateRoomValues,
} from "@/components/organisms/CreatePrivateRoomDialog";
import {
  JoinByCodeDialog,
  type JoinByCodeValues,
} from "@/components/organisms/JoinByCodeDialog";
import { SettingsDialog } from "@/components/organisms/SettingsDialog";
import {
  createRoom,
  getAvailableRooms,
  joinRoomById,
  saveSession,
  setActiveRoom,
} from "@/lib/colyseus";
import { useT } from "@/i18n/LocaleContext";

const FAKE_STATS = {
  username: "Guest",
  balance: 25750,
  winRate: 62,
  gamesPlayed: 127,
  totalProfit: 15250,
  maxBuyIn: 10000,
  online: 127,
};

const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const STARTING_CHIPS = 1000;

export default function LobbyPage() {
  const router = useRouter();
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);

  // Poll public room list every 5s.
  useEffect(() => {
    let cancelled = false;
    async function fetchRooms() {
      try {
        const rooms = await getAvailableRooms("poker");
        if (cancelled) return;
        setGames(
          rooms.map((r) => ({
            id: r.roomId,
            name: r.metadata?.tableName || `Table ${r.roomId.slice(0, 4)}`,
            blinds: `$${SMALL_BLIND}/$${BIG_BLIND}`,
            players: r.clients,
            maxPlayers: r.maxClients,
            buyIn: `$${STARTING_CHIPS}`,
            status: r.clients >= 2 ? "running" : "open",
            avgPot: "—",
          })),
        );
      } catch {
        // Server might be down or matchmake endpoint unreachable — leave list as-is.
      }
    }
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleQuickJoin(roomId: string) {
    const name = prompt(t("lobby.promptName"))?.trim();
    if (!name) return;
    setBusy(true);
    try {
      saveSession({ name });
      const room = await joinRoomById(roomId, { name });
      setActiveRoom(room);
      router.push(`/table/${room.roomId}`);
    } catch (e) {
      alert("Join failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(v: CreatePrivateRoomValues) {
    setBusy(true);
    try {
      const name = v.yourName.trim() || "Host";
      saveSession({ name, password: v.password });
      const room = await createRoom({
        private: v.isPrivate,
        tableName: v.tableName,
        password: v.password,
        name,
      });
      setActiveRoom(room);
      router.push(`/table/${room.roomId}`);
    } catch (e) {
      alert("Create failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(v: JoinByCodeValues) {
    setBusy(true);
    setJoinError(null);
    try {
      const name = v.yourName.trim() || "Guest";
      saveSession({ name, password: v.password });
      const room = await joinRoomById(v.roomId, {
        name,
        password: v.password,
      });
      setActiveRoom(room);
      router.push(`/table/${room.roomId}`);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-black text-gray-100">
      <LobbyHeader
        username={FAKE_STATS.username}
        balance={FAKE_STATS.balance}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded hover:shadow-lg hover:shadow-[#00ff88]/50"
            >
              {t("lobby.createRoom")}
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="px-4 py-2 border border-[#00ff88] text-[#00ff88] font-bold rounded hover:bg-[#00ff88]/10"
            >
              {t("lobby.joinByCode")}
            </button>
          </div>

          <GameList
            games={games}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onJoin={handleQuickJoin}
          />
        </div>

        <PlayerStatsPanel stats={FAKE_STATS} />
      </div>

      <CreatePrivateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        busy={busy}
      />
      <JoinByCodeDialog
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setJoinError(null);
        }}
        onSubmit={handleJoin}
        busy={busy}
        error={joinError}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
