"use client";

// Shared wayfinding chrome for interior pages, so every screen reads as a
// different room in the same building: a signage-style page header with a
// floor/room code, section dividers with level markers, stat "plates", and a
// warm architectural empty state. Deliberately restrained — type + rules +
// signage, not decorative cards.

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MONO = "font-mono uppercase tracking-[0.18em] text-[11px]";

/**
 * Signage page header. `code` is a wayfinding coordinate shown like a room
 * placard (e.g. "01 · EVENTS"). Renders the title in the display serif with a
 * hairline rule beneath, plus an optional action on the right.
 */
export function PageHeader({
  code,
  title,
  subtitle,
  action,
}: {
  code: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8"
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className={cn(MONO, "text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-2 flex items-center gap-2")}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {code}
          </div>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground max-w-xl">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-5 h-px w-full bg-black/[0.1] dark:bg-white/[0.1]" />
    </motion.header>
  );
}

/** A section divider that reads like a corridor sign: a level code + label. */
export function SectionMarker({
  code,
  label,
  right,
}: {
  code: string;
  label: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4 mb-5">
      <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] tabular-nums">
        {code}
      </span>
      <h2 className="font-display text-2xl">{label}</h2>
      <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1] translate-y-[-3px]" />
      {right}
    </div>
  );
}

/**
 * A "plate" — a bordered stat/figure block with a mono code corner, like a
 * numbered fixture on a wall. Used instead of glossy stat cards.
 */
export function Plate({
  code,
  value,
  label,
  accent,
  className,
}: {
  code: string;
  value: ReactNode;
  label: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-card p-5 md:p-6", className)}>
      <span
        className={cn(
          "font-mono text-xs",
          accent
            ? "text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
            : "text-muted-foreground"
        )}
      >
        {code}
      </span>
      <p className="mt-3 font-display text-3xl md:text-4xl tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

/** Hairline-gridded container that groups Plates edge-to-edge (blueprint feel). */
export function PlateRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Warm architectural empty state — a placard, not a sad spinner. */
export function EmptyPlate({
  code,
  title,
  hint,
  icon,
  action,
}: {
  code: string;
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-black/[0.14] dark:border-white/[0.14] py-14 px-6 text-center">
      {icon && <div className="mx-auto mb-4 text-muted-foreground/60 w-fit">{icon}</div>}
      <div className={cn(MONO, "text-muted-foreground/70 mb-2")}>{code}</div>
      <p className="font-display text-2xl">{title}</p>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
