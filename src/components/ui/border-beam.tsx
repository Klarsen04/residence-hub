"use client";

// Ported from Magic UI (MIT) — magicui.design/docs/components/border-beam
// Adapted for residence-hub: framer-motion import + inline styles instead of
// Tailwind v4-only utilities (mask-*, border-(length:), bg-linear-to-l), so it
// works on this project's Tailwind 3 setup.

import { motion, type MotionStyle, type Transition } from "framer-motion";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#a855f7",
  colorTo = "#3b82f6",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
}: BorderBeamProps) => {
  const maskStyle: React.CSSProperties = {
    borderWidth,
    WebkitMask:
      "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
    mask: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
    WebkitMaskComposite: "xor",
    maskComposite: "intersect",
    WebkitMaskClip: "padding-box, border-box",
    maskClip: "padding-box, border-box",
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent"
      style={maskStyle}
    >
      <motion.div
        className={cn("absolute aspect-square", className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
};
