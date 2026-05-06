"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";

export interface CreatePrivateRoomValues {
  tableName: string;
  password: string;
  yourName: string;
  isPrivate: boolean;
}

export function CreatePrivateRoomDialog({
  open,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: CreatePrivateRoomValues) => void;
  busy?: boolean;
}) {
  const t = useT();
  const [tableName, setTableName] = useState("");
  const [password, setPassword] = useState("");
  const [yourName, setYourName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  if (!open) return null;

  // Initialize with translated defaults the first time the dialog renders.
  const tableNameValue = tableName || t("create.defaultTableName");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-6 w-full max-w-md neon-border relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          aria-label={t("common.close")}
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-[#00ff88] mb-4">
          {t("create.title")}
        </h3>

        <Field label={t("create.yourName")}>
          <input
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder={t("create.defaultName")}
            className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none"
          />
        </Field>

        <Field label={t("create.tableName")}>
          <input
            value={tableNameValue}
            onChange={(e) => setTableName(e.target.value)}
            className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none"
          />
        </Field>

        <div className="flex gap-2 mb-3">
          <ToggleButton active={!isPrivate} onClick={() => setIsPrivate(false)}>
            {t("create.public")}
          </ToggleButton>
          <ToggleButton active={isPrivate} onClick={() => setIsPrivate(true)}>
            {t("create.private")}
          </ToggleButton>
        </div>

        {isPrivate && (
          <Field label={t("create.password")}>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("create.passwordPlaceholder")}
              className="w-full bg-black border border-[#2a2a2a] rounded px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none"
            />
          </Field>
        )}

        <button
          disabled={busy}
          onClick={() =>
            onSubmit({
              tableName: tableNameValue,
              password: isPrivate ? password : "",
              yourName,
              isPrivate,
            })
          }
          className="w-full mt-4 px-4 py-2 bg-[#00ff88] text-black font-bold rounded hover:shadow-lg hover:shadow-[#00ff88]/50 disabled:opacity-50"
        >
          {busy ? t("create.creating") : t("create.submit")}
        </button>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 px-3 py-2 rounded text-sm font-bold border transition-all " +
        (active
          ? "bg-[#00ff88] text-black border-[#00ff88]"
          : "bg-transparent text-[#00ff88] border-[#2a2a2a] hover:border-[#00ff88]/50")
      }
    >
      {children}
    </button>
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
