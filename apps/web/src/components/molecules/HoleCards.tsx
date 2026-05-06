"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CardBack,
  PlayingCard,
  type Size,
} from "@/components/atoms/PlayingCard";

const DEAL_STAGGER = 0.18;

export function HoleCards({
  cards,
  faceDown = false,
  size = "md",
}: {
  cards?: string[] | null;
  faceDown?: boolean;
  size?: Size;
}) {
  const showFaceDown = faceDown || !cards || cards.length === 0;

  if (showFaceDown) {
    // Two face-down cards arriving one after the other from above.
    return (
      <div className="flex gap-1">
        {[0, 1].map((i) => (
          <motion.div
            key={`back-${i}`}
            initial={{ opacity: 0, y: -40, x: -8, rotate: -12, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 22,
              delay: i * DEAL_STAGGER,
            }}
            style={{ transformOrigin: "center center" }}
          >
            <CardBack size={size} />
          </motion.div>
        ))}
      </div>
    );
  }

  // Cards face-up: brief arrival from above, then 3D flip — staggered.
  return (
    <div className="flex gap-1" style={{ perspective: 600 }}>
      <AnimatePresence mode="popLayout">
        {cards!.map((c, i) => (
          <motion.div
            key={c + "@" + i}
            initial={{
              opacity: 0,
              y: -30,
              rotateY: 180,
              scale: 0.85,
            }}
            animate={{
              opacity: 1,
              y: 0,
              rotateY: 0,
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.2, delay: i * DEAL_STAGGER },
              y: {
                type: "spring",
                stiffness: 320,
                damping: 24,
                delay: i * DEAL_STAGGER,
              },
              scale: {
                type: "spring",
                stiffness: 320,
                damping: 24,
                delay: i * DEAL_STAGGER,
              },
              rotateY: {
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
                // Begin the flip after the card has arrived in place.
                delay: i * DEAL_STAGGER + 0.15,
              },
            }}
            style={{
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            <PlayingCard card={c} size={size} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
