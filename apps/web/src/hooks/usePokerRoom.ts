"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "colyseus.js";
import {
  joinRoomById,
  loadSession,
  setActiveRoom,
  takeActiveRoom,
  tryReconnect,
} from "@/lib/colyseus";

export interface PlayerView {
  id: string;
  name: string;
  seat: number;
  chips: number;
  bet: number;
  totalBet: number;
  status: string;
  hasActed: boolean;
  hasHoleCards: boolean;
  connected: boolean;
  /** Public hole cards (only populated at showdown for non-folded players). */
  revealedHole: string[];
  /** Hand category at showdown (e.g. "two_pair"). Empty unless cards revealed. */
  revealedCategory: string;
  /** Guest "ready" flag — host is implicitly always ready. */
  ready: boolean;
  /** True for AI players added by the host. */
  isBot: boolean;
}

export interface WinnerView {
  id: string;
  amount: number;
  category: string;
}

export interface SidePotView {
  amount: number;
  eligibleIds: string[];
}

export interface PokerRoomView {
  tableName: string;
  isPrivate: boolean;
  hostId: string;
  pot: number;
  currentBet: number;
  minRaise: number;
  smallBlind: number;
  bigBlind: number;
  stage: string;
  dealerSeat: number;
  activeSeat: number;
  /** Epoch ms when active player auto-folds. 0 if no timer armed. */
  turnDeadline: number;
  community: string[];
  players: PlayerView[];
  winners: WinnerView[];
  sidePots: SidePotView[];
}

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number };

export interface UsePokerRoomResult {
  room: Room | null;
  view: PokerRoomView | null;
  /** Your private hole cards for the current hand. */
  holeCards: string[] | null;
  error: string | null;
  /** Last server-sent action error (e.g. "not your turn"). */
  actionError: string | null;
  status: "connecting" | "connected" | "error" | "needs-join";
  sendAction: (action: Action) => void;
  /** Guests toggle ready; ignored for host. */
  sendReady: () => void;
  /** Host requests start of the first hand. */
  sendStart: () => void;
  /** Host-only: add an AI bot to the table (private rooms, pre-hand). */
  sendAddBot: () => void;
  /** Host-only: remove a bot from the table (private rooms, pre-hand). */
  sendRemoveBot: (botId: string) => void;
  /** True iff it's your turn to act. */
  isYourTurn: boolean;
  /** You as a PlayerView, if you're seated. */
  me: PlayerView | null;
  /** True iff you're the room host. */
  isHost: boolean;
}

export function usePokerRoom(roomId: string): UsePokerRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<PokerRoomView | null>(null);
  const [holeCards, setHoleCards] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<UsePokerRoomResult["status"]>(
    "connecting",
  );

  const roomRef = useRef<Room | null>(null);
  /** Holds a deferred leave timer so React Strict Mode's mount→cleanup→mount
      double-effect doesn't actually disconnect us (the second mount cancels it). */
  const pendingLeaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If a previous cleanup queued a leave, cancel it — we're still mounted.
    if (pendingLeaveRef.current) {
      clearTimeout(pendingLeaveRef.current);
      pendingLeaveRef.current = null;
    }

    let cancelled = false;

    function attachListeners(r: Room) {
      r.onMessage("hole", (msg: { cards: string[] }) => {
        setHoleCards(msg.cards);
      });
      r.onMessage("error", (msg: { message: string }) => {
        setActionError(msg.message);
        setTimeout(() => setActionError(null), 3000);
      });

      const refresh = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s: any = r.state;
        const players: PlayerView[] = [];
        s.players?.forEach(
          (
            p: PlayerView & {
              revealedHole?: string[];
              revealedCategory?: string;
              ready?: boolean;
              isBot?: boolean;
            },
          ) => {
            const revealedHole: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p.revealedHole as any)?.forEach?.((c: string) =>
              revealedHole.push(c),
            );
            players.push({
              id: p.id,
              name: p.name,
              seat: p.seat,
              chips: p.chips,
              bet: p.bet,
              totalBet: p.totalBet,
              status: p.status,
              hasActed: p.hasActed,
              hasHoleCards: p.hasHoleCards,
              connected: p.connected,
              revealedHole,
              revealedCategory: p.revealedCategory ?? "",
              ready: !!p.ready,
              isBot: !!p.isBot,
            });
          },
        );
        const winners: WinnerView[] = [];
        s.winners?.forEach((w: WinnerView) =>
          winners.push({
            id: w.id,
            amount: w.amount,
            category: w.category,
          }),
        );
        const community: string[] = [];
        s.communityCards?.forEach((c: string) => community.push(c));
        const sidePots: SidePotView[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s.sidePots?.forEach((sp: any) => {
          const ids: string[] = [];
          sp.eligibleIds?.forEach((id: string) => ids.push(id));
          sidePots.push({ amount: sp.amount, eligibleIds: ids });
        });

        setView({
          tableName: s.tableName ?? "",
          isPrivate: !!s.isPrivate,
          hostId: s.hostId ?? "",
          pot: s.pot ?? 0,
          currentBet: s.currentBet ?? 0,
          minRaise: s.minRaise ?? 0,
          smallBlind: s.smallBlind ?? 0,
          bigBlind: s.bigBlind ?? 0,
          stage: s.stage ?? "waiting",
          dealerSeat: s.dealerSeat ?? -1,
          activeSeat: s.activeSeat ?? -1,
          turnDeadline: s.turnDeadline ?? 0,
          community,
          players,
          winners,
          sidePots,
        });
      };

      r.onStateChange(refresh);
      refresh();
    }

    async function attach(r: Room) {
      if (cancelled) {
        r.leave();
        return;
      }
      roomRef.current = r;
      setRoom(r);
      setStatus("connected");
      attachListeners(r);
    }

    async function init() {
      // 1) In-memory active room (just-created from lobby)
      const existing = takeActiveRoom(roomId);
      if (existing) {
        await attach(existing);
        return;
      }

      // 2) Try reconnect with stored token (refresh-survival path)
      const reconnected = await tryReconnect(roomId);
      if (reconnected) {
        setActiveRoom(reconnected);
        await attach(reconnected);
        return;
      }

      // 3) Fall back to fresh join with stored name/password
      const session = loadSession();
      if (!session) {
        setStatus("needs-join");
        return;
      }

      try {
        const r = await joinRoomById(roomId, {
          name: session.name,
          password: session.password,
        });
        setActiveRoom(r);
        await attach(r);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      const r = roomRef.current;
      if (!r) return;
      // Defer leave: if React Strict Mode immediately re-mounts this effect,
      // the next setup will clear this timer and reuse the room. Real navigation
      // away just means the leave fires 50ms later — not user-visible.
      pendingLeaveRef.current = setTimeout(() => {
        pendingLeaveRef.current = null;
        r.leave();
        setActiveRoom(null);
      }, 50);
    };
  }, [roomId]);

  // Clear hole cards when a brand-new hand begins (server will resend on deal).
  useEffect(() => {
    if (!view) return;
    if (view.stage === "waiting") setHoleCards(null);
  }, [view?.stage]);

  const sendAction = useCallback((action: Action) => {
    const r = roomRef.current;
    if (!r) return;
    r.send("action", action);
  }, []);

  const sendReady = useCallback(() => {
    roomRef.current?.send("ready");
  }, []);

  const sendStart = useCallback(() => {
    roomRef.current?.send("start");
  }, []);

  const sendAddBot = useCallback(() => {
    roomRef.current?.send("addBot");
  }, []);

  const sendRemoveBot = useCallback((botId: string) => {
    roomRef.current?.send("removeBot", { id: botId });
  }, []);

  const me =
    view && room
      ? view.players.find((p) => p.id === room.sessionId) ?? null
      : null;
  const isYourTurn =
    !!me &&
    view !== null &&
    view.activeSeat === me.seat &&
    me.status === "active";
  const isHost = !!room && !!view && view.hostId === room.sessionId;

  return {
    room,
    view,
    holeCards,
    error,
    actionError,
    status,
    sendAction,
    sendReady,
    sendStart,
    sendAddBot,
    sendRemoveBot,
    isYourTurn,
    me,
    isHost,
  };
}
