"use client";

import { useState } from "react";
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
import {
  createRoom,
  joinRoomById,
  saveSession,
  setActiveRoom,
} from "@/lib/colyseus";

// Static demo rows — public room listing not yet wired to Colyseus matchmake API.
// Private rooms (Create / Join by Code) are fully wired.
const DEMO_GAMES: GameRow[] = [
  { id: "demo-1", name: "Demo (UI only)", blinds: "$1/$2", players: 0, maxPlayers: 6, buyIn: "$100-$500", status: "open", avgPot: "—" },
];

const FAKE_STATS = {
  username: "Guest",
  balance: 25750,
  winRate: 62,
  gamesPlayed: 127,
  totalProfit: 15250,
  maxBuyIn: 10000,
  online: 127,
};

export default function LobbyPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  function handleQuickJoin(_id: string) {
    alert(
      "Public matchmaking not wired yet — use 'Create Private Room' or 'Join by Code'.",
    );
  }

  async function handleCreate(v: CreatePrivateRoomValues) {
    setBusy(true);
    try {
      const name = v.yourName.trim() || "Host";
      saveSession({ name, password: v.password });
      const room = await createRoom({
        private: true,
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
      <LobbyHeader username={FAKE_STATS.username} balance={FAKE_STATS.balance} />

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded hover:shadow-lg hover:shadow-[#00ff88]/50"
            >
              + Create Private Room
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="px-4 py-2 border border-[#00ff88] text-[#00ff88] font-bold rounded hover:bg-[#00ff88]/10"
            >
              Join by Code
            </button>
          </div>

          <GameList
            games={DEMO_GAMES}
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
    </div>
  );
}
