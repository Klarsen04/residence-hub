"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Small shared pieces of the residence "wayfinding" language — the signage,
 * coordinates and section markers that recur across the landing journey so it
 * reads as one building, not a stack of unrelated sections.
 */

/** A tracked-out mono signage label, optionally with a leading coordinate. */
export function SignLabel({
  children,
  code,
  className,
}: {
  children: ReactNode;
  code?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 wayfinding text-muted-foreground", className)}>
      {code && (
        <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
          {code}
        </span>
      )}
      {children}
    </span>
  );
}

/** Section marker: a floor/level number set beside an editorial section title. */
export function LevelMarker({
  level,
  label,
}: {
  level: string;
  label: string;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] tabular-nums">
        {level}
      </span>
      <span className="wayfinding text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1] translate-y-[-2px]" />
    </div>
  );
}

/** A framed directional pointer, like a corridor arrow on a sign. */
export function DirectionArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path
        d="M4 12h15M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reveal text/blocks as they scroll into view — a quiet, editorial rise. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
