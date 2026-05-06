"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { PokerTable } from "@/components/organisms/PokerTable";
import { ActionBar } from "@/components/organisms/ActionBar";
import { usePokerRoom } from "@/hooks/usePokerRoom";
import { formatChips } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export default function TablePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const t = useT();
  const {
    room,
    view,
    holeCards,
    error,
    actionError,
    status,
    sendAction,
    sendReady,
    sendStart,
    isYourTurn,
    me,
    isHost,
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
        <p>{t("table.needsName")}</p>
        <BackButton router={router} label={t("common.back")} />
      </CenteredMessage>
    );
  }
  if (status === "error") {
    return (
      <CenteredMessage>
        <p className="text-red-400">
          {t("table.failedJoin", { error: error ?? "" })}
        </p>
        <BackButton router={router} label={t("common.back")} />
      </CenteredMessage>
    );
  }
  if (status === "connecting" || !view) {
    return (
      <CenteredMessage>
        <p className="text-[#00ff88] neon-text text-xl">
          {t("table.connecting")}
        </p>
      </CenteredMessage>
    );
  }

  const winnerIds = new Set(view.winners.map((w) => w.id));
  const players = view.players.map((p) => {
    const isActive = view.activeSeat === p.seat && p.status === "active";
    return {
      id: p.id,
      name: p.name,
      chips: p.chips,
      bet: p.bet,
      seat: p.seat,
      status: p.status,
      isYou: p.id === room?.sessionId,
      isActive,
      isDealer: view.dealerSeat === p.seat,
      hasHoleCards: p.hasHoleCards,
      holeCards: p.id === room?.sessionId ? holeCards : null,
      revealedHole: p.revealedHole,
      revealedCategory: p.revealedCategory,
      isWinner: winnerIds.has(p.id),
      turnDeadline: isActive ? view.turnDeadline : 0,
      turnTotalMs: 30_000,
    };
  });

  return (
    <main className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden px-2 sm:px-0">
      {/* Top-left: back + table info */}
      <div className="absolute top-2 left-2 sm:top-6 sm:left-6 text-[#a0a0a0] text-[10px] sm:text-xs z-10 flex flex-col gap-0.5 sm:gap-1.5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 sm:gap-2 text-[#00ff88] hover:text-white"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>{t("common.back")}</span>
        </button>
        <div className="neon-text text-[#00ff88] mt-1 sm:mt-2 font-bold truncate max-w-[120px] sm:max-w-none">
          {view.tableName}
        </div>
        <div>{t(`table.stage.${view.stage}`)}</div>
        <div>
          ${view.smallBlind}/${view.bigBlind} · {view.players.length}/6
        </div>
      </div>

      {/* Top-right: room code */}
      <div className="absolute top-2 right-2 sm:top-6 sm:right-6 z-10">
        <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-1.5 sm:p-3 flex items-center gap-1.5 sm:gap-3">
          <div>
            <div className="text-[8px] sm:text-[10px] text-gray-400 uppercase">
              {t("common.code")}
            </div>
            <div className="font-mono text-[#00ff88] text-[10px] sm:text-sm">{roomId}</div>
          </div>
          <button
            onClick={copyCode}
            className="text-[#00ff88] hover:text-white"
            title={t("common.copy")}
            aria-label={t("common.copy")}
          >
            {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Table */}
      <PokerTable
        players={players}
        pot={view.pot}
        community={view.community}
        sidePots={view.sidePots}
        stage={view.stage}
        dealerSeat={view.dealerSeat}
      />

      {/* Bottom: action bar OR waiting message OR winner banner */}
      <div className="absolute bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-1rem)] sm:w-auto max-w-md sm:max-w-none">
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
          view.isPrivate ? (
            <PrivateLobbyPanel
              isHost={isHost}
              myReady={!!me?.ready}
              players={view.players.map((p) => ({
                id: p.id,
                name: p.name,
                ready: p.ready,
                isHost: p.id === view.hostId,
              }))}
              onReady={sendReady}
              onStart={sendStart}
            />
          ) : (
            <div className="bg-[#1a1a1a] border border-[#00ff88]/40 rounded-lg px-6 py-3 text-[#a0a0a0] text-sm">
              {t("table.waitingMore", {
                n: Math.max(0, 2 - view.players.length),
              })}
            </div>
          )
        ) : me && me.status === "folded" ? (
          <div className="bg-[#1a1a1a] border border-red-400/40 rounded-lg px-6 py-3 text-red-300 text-sm">
            {t("table.youFolded")}
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#00ff88]/40 rounded-lg px-6 py-3 text-[#a0a0a0] text-sm">
            {t("table.waitingOpponent")}
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
  const t = useT();
  return (
    <motion.div
      initial={{ y: 60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className="bg-[#1a1a1a] border-2 border-[#00ff88] rounded-lg px-6 py-4 neon-border text-center"
    >
      <div className="text-[#00ff88] text-xs uppercase tracking-wider mb-1">
        {t("winner.complete")}
      </div>
      <div className="text-white font-bold">
        {winners.map((w) => (
          <div key={w.id}>
            {t("winner.wins", {
              name: w.name,
              amount: formatChips(w.amount),
            })}
            {w.category && ` — ${t(`hand.${w.category}`)}`}
          </div>
        ))}
      </div>
      <div className="text-[#a0a0a0] text-xs mt-2">{t("winner.next")}</div>
    </motion.div>
  );
}

function PrivateLobbyPanel({
  isHost,
  myReady,
  players,
  onReady,
  onStart,
}: {
  isHost: boolean;
  myReady: boolean;
  players: { id: string; name: string; ready: boolean; isHost: boolean }[];
  onReady: () => void;
  onStart: () => void;
}) {
  const t = useT();
  const guests = players.filter((p) => !p.isHost);
  const allReady = players.length >= 2 && guests.every((p) => p.ready);
  const notReady = guests.filter((p) => !p.ready).length;

  return (
    <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-4 sm:p-5 shadow-lg shadow-[#00ff88]/30 flex flex-col gap-3 w-full sm:min-w-[360px] sm:w-auto">
      <div className="text-[#00ff88] font-bold text-xs sm:text-sm uppercase tracking-wider neon-text">
        {t("lobby.private.title", { n: players.length })}
      </div>

      <ul className="space-y-1 text-sm">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 px-2 py-1 rounded bg-black/40"
          >
            <span className="text-white truncate">
              {p.name}
              {p.isHost && (
                <span className="ml-2 text-[10px] text-[#ffaa00] font-bold">
                  {t("lobby.private.host")}
                </span>
              )}
            </span>
            {p.isHost ? (
              <span className="text-[10px] uppercase tracking-wider text-[#a0a0a0]">
                {t("lobby.private.implicitReady")}
              </span>
            ) : p.ready ? (
              <span className="text-[10px] uppercase tracking-wider text-[#00ff88] neon-text">
                {t("lobby.private.ready")}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                {t("lobby.private.notReady")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!allReady}
          className={
            "px-4 py-2 rounded font-bold text-sm transition-all " +
            (allReady
              ? "bg-[#00ff88] text-black hover:shadow-lg hover:shadow-[#00ff88]/50"
              : "bg-[#2a2a2a] text-gray-500 cursor-not-allowed")
          }
        >
          {players.length < 2
            ? t("lobby.private.startNeedGuest")
            : !allReady
              ? t("lobby.private.startNotReady", { n: notReady })
              : t("lobby.private.start")}
        </button>
      ) : (
        <button
          onClick={onReady}
          className={
            "px-4 py-2 rounded font-bold text-sm transition-all border " +
            (myReady
              ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88] neon-text"
              : "bg-[#00ff88] text-black border-[#00ff88] hover:shadow-lg hover:shadow-[#00ff88]/50")
          }
        >
          {myReady ? t("lobby.private.btnReadyOn") : t("lobby.private.btnReady")}
        </button>
      )}
    </div>
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
  label,
}: {
  router: ReturnType<typeof useRouter>;
  label: string;
}) {
  return (
    <button
      onClick={() => router.push("/")}
      className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded"
    >
      {label}
    </button>
  );
}
