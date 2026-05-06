"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "@/components/atoms/PlayingCard";

/**
 * The flop reveals 3 cards at once, but a real dealer flips them one at a time.
 * We compute a per-slot stagger relative to which "street" each card belongs to:
 *   slots 0,1,2 = flop (each ~140ms apart)
 *   slot 3 = turn
 *   slot 4 = river
 *
 * Within a street, only newly-arriving cards animate; cards already on the table
 * stay put because their `key` is the card string itself (stable across renders).
 */
const STREET_DELAY_MS = 140;

export function CommunityCards({ cards }: { cards: string[] }) {
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);
  const dealtCount = cards.length;

  return (
    <div className="flex gap-1 sm:gap-2">
      {slots.map((c, i) => {
        // Stagger delay: only stagger within the most recent reveal batch.
        // Flop = first 3 dealt simultaneously by engine → stagger by index.
        // Turn (slot 3), river (slot 4) deal alone → no stagger.
        const inFlop = i < 3 && dealtCount >= 3;
        const stagger = inFlop ? (i * STREET_DELAY_MS) / 1000 : 0;

        return (
          <div
            key={i}
            className="relative w-10 h-14 sm:w-14 sm:h-20"
          >
            {/* Empty slot placeholder — always rendered behind any card */}
            <div className="absolute inset-0 rounded-md border-2 border-dashed border-[#00ff88]/20" />

            <AnimatePresence>
              {c && (
                <motion.div
                  key={c}
                  className="absolute inset-0"
                  // Initial: small + lifted up + tilted, like coming off the deck.
                  initial={{
                    opacity: 0,
                    y: -120,
                    x: 8,
                    rotate: -18,
                    scale: 0.6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x: 0,
                    rotate: 0,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    mass: 0.9,
                    delay: stagger,
                  }}
                  style={{ transformOrigin: "center center" }}
                >
                  <PlayingCard card={c} size="md" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
