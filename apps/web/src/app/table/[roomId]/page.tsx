"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { PokerTable } from "@/components/organisms/PokerTable";
import { ActionBar } from "@/components/organisms/ActionBar";
import { usePokerRoom } from "@/hooks/usePokerRoom";

const STAGE_LABEL: Record<string, string> = {
  waiting: "Waiting for players…",
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  complete: "Hand complete",
};

export default function TablePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const {
    room,
    view,
    holeCards,
    error,
    actionError,
    status,
    sendAction,
    isYourTurn,
    me,
  } = usePokerRoom(roomId);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (status === "needs-join") {
    return (
      <CenteredMessage>
        <p>This room requires a name (and possibly password).</p>
        <BackButton router={router} />
      </CenteredMessage>
    );
  }
  if (status === "error") {
    return (
      <CenteredMessage>
        <p className="text-red-400">Failed to join: {error}</p>
        <BackButton router={router} />
      </CenteredMessage>
    );
  }
  if (status === "connecting" || !view) {
    return (
      <CenteredMessage>
        <p className="text-[#00ff88] neon-text text-xl">Connecting…</p>
      </CenteredMessage>
    );
  }

  const players = view.players.map((p) => ({
    id: p.id,
    name: p.name,
    chips: p.chips,
    bet: p.bet,
    seat: p.seat,
    status: p.status,
    isYou: p.id === room?.sessionId,
    isActive: view.activeSeat === p.seat && p.status === "active",
    isDealer: view.dealerSeat === p.seat,
    hasHoleCards: p.hasHoleCards,
    holeCards: p.id === room?.sessionId ? holeCards : null,
    revealedHole: p.revealedHole,
  }));

  return (
    <main className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Top-left: back + table info */}
      <div className="absolute top-6 left-6 text-[#a0a0a0] text-xs z-10 flex flex-col gap-1.5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-[#00ff88] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to lobby
        </button>
        <div className="neon-text text-[#00ff88] mt-2 font-bold">
          {view.tableName}
        </div>
        <div>Stage: {STAGE_LABEL[view.stage] ?? view.stage}</div>
        <div>
          Blinds: ${view.smallBlind}/${view.bigBlind}
        </div>
        <div>
          Players: {view.players.length}/6
        </div>
      </div>

      {/* Top-right: room code */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-3 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-gray-400 uppercase">Room code</div>
            <div className="font-mono text-[#00ff88] text-sm">{roomId}</div>
          </div>
          <button
            onClick={copyCode}
            className="text-[#00ff88] hover:text-white"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Table */}
      <PokerTable
        players={players}
        pot={view.pot}
        community={view.community}
        sidePots={view.sidePots}
      />

      {/* Bottom: action bar OR waiting message OR winner banner */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        {view.stage === "complete" && view.winners.length > 0 ? (
          <WinnerBanner
            winners={view.winners.map((w) => ({
              ...w,
              name:
                view.players.find((p) => p.id === w.id)?.name ?? w.id.slice(0, 6),
            }))}
          />
        ) : isYourTurn && me ? (
          <ActionBar
            chips={me.chips}
            myBet={me.bet}
            currentBet={view.currentBet}
            minRaise={view.minRaise}
            bigBlind={view.bigBlind}
            onFold={() => sendAction({ type: "fold" })}
            onCheck={() => sendAction({ type: "check" })}
            onCall={() => sendAction({ type: "call" })}
            onBet={(amount) => sendAction({ type: "bet", amount })}
            onRaise={(amount) => sendAction({ type: "raise", amount })}
          />
        ) : view.stage === "waiting" ? (
          <div className="bg-[#1a1a1a] border border-[#00ff88]/40 rounded-lg px-6 py-3 text-[#a0a0a0] text-sm">
            Waiting for {Math.max(0, 2 - view.players.length)} more player
            {2 - view.players.length === 1 ? "" : "s"} to start…
          </div>
        ) : me && me.status === "folded" ? (
          <div className="bg-[#1a1a1a] border border-red-400/40 rounded-lg px-6 py-3 text-red-300 text-sm">
            You folded. Waiting for the hand to finish…
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#00ff88]/40 rounded-lg px-6 py-3 text-[#a0a0a0] text-sm">
            Waiting for opponent…
          </div>
        )}
      </div>

      {/* Action error toast */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            key="err"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 border border-red-500 text-red-100 px-4 py-2 rounded shadow-lg"
          >
            ⚠ {actionError}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function WinnerBanner({
  winners,
}: {
  winners: { id: string; name: string; amount: number; category: string }[];
}) {
  const labels: Record<string, string> = {
    high_card: "High Card",
    pair: "Pair",
    two_pair: "Two Pair",
    three_of_a_kind: "Three of a Kind",
    straight: "Straight",
    flush: "Flush",
    full_house: "Full House",
    four_of_a_kind: "Four of a Kind",
    straight_flush: "Straight Flush",
  };
  return (
    <motion.div
      initial={{ y: 60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className="bg-[#1a1a1a] border-2 border-[#00ff88] rounded-lg px-6 py-4 neon-border text-center"
    >
      <div className="text-[#00ff88] text-xs uppercase tracking-wider mb-1">
        Hand complete
      </div>
      <div className="text-white font-bold">
        {winners.map((w) => (
          <div key={w.id}>
            {w.name} wins ${w.amount.toLocaleString()}
            {w.category && ` — ${labels[w.category] ?? w.category}`}
          </div>
        ))}
      </div>
      <div className="text-[#a0a0a0] text-xs mt-2">Next hand starts in 5s…</div>
    </motion.div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center space-y-3 max-w-md">{children}</div>
    </main>
  );
}

function BackButton({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <button
      onClick={() => router.push("/")}
      className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded"
    >
      Back to lobby
    </button>
  );
}
