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
  pot: number;
  currentBet: number;
  minRaise: number;
  smallBlind: number;
  bigBlind: number;
  stage: string;
  dealerSeat: number;
  activeSeat: number;
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
  /** True iff it's your turn to act. */
  isYourTurn: boolean;
  /** You as a PlayerView, if you're seated. */
  me: PlayerView | null;
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

  useEffect(() => {
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
        s.players?.forEach((p: PlayerView & { revealedHole?: string[] }) => {
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
          });
        });
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
          pot: s.pot ?? 0,
          currentBet: s.currentBet ?? 0,
          minRaise: s.minRaise ?? 0,
          smallBlind: s.smallBlind ?? 0,
          bigBlind: s.bigBlind ?? 0,
          stage: s.stage ?? "waiting",
          dealerSeat: s.dealerSeat ?? -1,
          activeSeat: s.activeSeat ?? -1,
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
      if (r) {
        r.leave();
        setActiveRoom(null);
      }
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

  const me =
    view && room
      ? view.players.find((p) => p.id === room.sessionId) ?? null
      : null;
  const isYourTurn =
    !!me &&
    view !== null &&
    view.activeSeat === me.seat &&
    me.status === "active";

  return {
    room,
    view,
    holeCards,
    error,
    actionError,
    status,
    sendAction,
    isYourTurn,
    me,
  };
}
