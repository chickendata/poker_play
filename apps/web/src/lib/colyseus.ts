"use client";

import { Client, type Room } from "colyseus.js";

const ENDPOINT =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";

let client: Client | null = null;

export function getColyseusClient(): Client {
  if (!client) client = new Client(ENDPOINT);
  return client;
}

export interface CreateOptions {
  tableName: string;
  password?: string;
  name: string;
  private?: boolean;
}

export async function createRoom(opts: CreateOptions): Promise<Room> {
  const room = await getColyseusClient().create("poker", {
    private: opts.private ?? true,
    password: opts.password || undefined,
    tableName: opts.tableName,
    name: opts.name,
  });
  rememberRoomForReconnect(room, { name: opts.name, password: opts.password });
  return room;
}

export async function joinRoomById(
  roomId: string,
  opts: { name: string; password?: string },
): Promise<Room> {
  const room = await getColyseusClient().joinById(roomId, {
    name: opts.name,
    password: opts.password || undefined,
  });
  rememberRoomForReconnect(room, { name: opts.name, password: opts.password });
  return room;
}

/**
 * Try to reconnect to a previous room using the stored token. Returns the room
 * on success, null if no token / token expired / wrong room.
 */
export async function tryReconnect(roomId: string): Promise<Room | null> {
  const session = loadSession();
  if (!session?.reconnectionToken || session.roomId !== roomId) return null;
  try {
    const room = await getColyseusClient().reconnect(session.reconnectionToken);
    // Refresh stored token (it stays valid but no harm re-saving)
    rememberRoomForReconnect(room, {
      name: session.name,
      password: session.password,
    });
    return room;
  } catch {
    // Token expired or server doesn't recognize — clear and let caller fall back
    clearReconnect();
    return null;
  }
}

/* sessionStorage helpers */

const STORAGE_KEY = "poker.session";

export interface StoredSession {
  name: string;
  password?: string;
  reconnectionToken?: string;
  roomId?: string;
}

export function saveSession(s: StoredSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function rememberRoomForReconnect(
  room: Room,
  opts: { name: string; password?: string },
) {
  saveSession({
    name: opts.name,
    password: opts.password,
    reconnectionToken: room.reconnectionToken,
    roomId: room.roomId,
  });
}

export function clearReconnect() {
  const s = loadSession();
  if (!s) return;
  saveSession({ name: s.name, password: s.password });
}

/* Singleton active-room store. The lobby creates/joins a room, stashes it here,
   then navigates to /table/[roomId] which picks it up instead of joining again. */
let activeRoom: Room | null = null;

export function setActiveRoom(room: Room | null) {
  activeRoom = room;
}

export function takeActiveRoom(roomId: string): Room | null {
  if (activeRoom && activeRoom.roomId === roomId) {
    return activeRoom;
  }
  return null;
}
