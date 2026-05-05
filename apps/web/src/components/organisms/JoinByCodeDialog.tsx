"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface JoinByCodeValues {
  roomId: string;
  password: string;
  yourName: string;
}

export function JoinByCodeDialog({
  open,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: JoinByCodeValues) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [yourName, setYourName] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-6 w-full max-w-md neon-border relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-[#00ff88] mb-4">Join by Code</h3>

        <Field label="Your name">
          <input
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="Player 2"
            className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none"
          />
        </Field>

        <Field label="Room code">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.trim())}
            placeholder="e.g. ABCD1234"
            className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono uppercase focus:border-[#00ff88] focus:outline-none"
          />
        </Field>

        <Field label="Password (if required)">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none"
          />
        </Field>

        {error && (
          <p className="text-red-400 text-sm mt-2 mb-2">Error: {error}</p>
        )}

        <button
          disabled={busy || !roomId}
          onClick={() => onSubmit({ roomId, password, yourName })}
          className="w-full mt-4 px-4 py-2 bg-[#00ff88] text-black font-bold rounded hover:shadow-lg hover:shadow-[#00ff88]/50 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join Room"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}
