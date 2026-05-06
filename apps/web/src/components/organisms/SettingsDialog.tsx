"use client";

import { X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/translations";

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, setLocale, t } = useLocale();

  if (!open) return null;

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
          {t("settings.title")}
        </h3>

        <label className="block">
          <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
            {t("settings.language")}
          </span>
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l as Locale)}
                className={
                  "flex-1 px-3 py-2 rounded text-sm font-bold border transition-all " +
                  (l === locale
                    ? "bg-[#00ff88] text-black border-[#00ff88]"
                    : "bg-transparent text-[#00ff88] border-[#2a2a2a] hover:border-[#00ff88]/50")
                }
              >
                {LOCALE_LABELS[l as Locale]}
              </button>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
