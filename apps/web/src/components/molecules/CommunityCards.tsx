"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "@/components/atoms/PlayingCard";

export function CommunityCards({ cards }: { cards: string[] }) {
  // 5 slots, fill with cards or placeholders
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);
  return (
    <div className="flex gap-2">
      {slots.map((c, i) => (
        <div key={i} className="relative w-14 h-20">
          {/* Placeholder always present, behind card */}
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-[#00ff88]/20" />
          <AnimatePresence>
            {c && (
              <motion.div
                key={c}
                className="absolute inset-0"
                initial={{ opacity: 0, y: -60, rotate: -8, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 20,
                  delay: 0.05 * (i % 3), // small stagger within a flop
                }}
              >
                <PlayingCard card={c} size="md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
