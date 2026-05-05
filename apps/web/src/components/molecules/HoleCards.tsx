"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CardBack,
  PlayingCard,
  type Size,
} from "@/components/atoms/PlayingCard";

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
    return (
      <div className="flex gap-1">
        <CardBack size={size} />
        <CardBack size={size} />
      </div>
    );
  }

  // Cards are face-up — animate a flip when they appear
  return (
    <div className="flex gap-1">
      <AnimatePresence mode="popLayout">
        {cards!.map((c, i) => (
          <motion.div
            key={c + "@" + i}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{
              duration: 0.45,
              delay: 0.1 * i,
              ease: "easeOut",
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <PlayingCard card={c} size={size} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
