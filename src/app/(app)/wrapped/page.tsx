"use client";

// Residence Life Wrapped — a Spotify-Wrapped-style season recap for the RA.
// Showcases the ported Magic UI components: SparklesText header, NumberTicker
// stat counts, BlurFade staggered reveals, and BorderBeam glowing highlight
// cards. Inspired by Ctrl+Meet's end-of-season "Wrapped + badges".

import { useMemo } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Calendar, Users, MessageCircle, ClipboardCheck, AlertTriangle,
  BarChart2, StickyNote, ShieldCheck, Palette, Lightbulb, Trophy, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { SparklesText } from "@/components/ui/sparkles-text";
import { computeBadges, type WrappedStats } from "@/lib/wrapped/badges";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface WrappedData {
  name: string;
  stats: WrappedStats;
  highlights: {
    topCategory: string | null;
    busiestMonth: string | null;
    biggestEvent: { title: string; attendance: number } | null;
  };
}

const STAT_META: { key: keyof WrappedStats; label: string; icon: typeof Calendar; gradient: string }[] = [
  { key: "events", label: "Events Hosted", icon: Calendar, gradient: "from-primary to-primary" },
  { key: "totalAttendance", label: "Total Attendance", icon: Users, gradient: "from-accent to-rose-500" },
  { key: "checkIns", label: "Check-Ins", icon: MessageCircle, gradient: "from-accent to-[hsl(var(--sage-soft))]" },
  { key: "roomChecks", label: "Room Check Rounds", icon: ClipboardCheck, gradient: "from-emerald-500 to-[hsl(var(--sage-soft))]" },
  { key: "residents", label: "Residents", icon: Users, gradient: "from-amber-500 to-orange-500" },
  { key: "dutyShifts", label: "Duty Shifts", icon: ShieldCheck, gradient: "from-primary to-primary" },
  { key: "polls", label: "Polls Run", icon: BarChart2, gradient: "from-accent to-accent" },
  { key: "decorationsMade", label: "Decorations Made", icon: Palette, gradient: "from-rose-500 to-red-500" },
  { key: "notes", label: "Notes Kept", icon: StickyNote, gradient: "from-[hsl(var(--sage-soft))] to-accent" },
  { key: "inspirations", label: "Inspirations", icon: Lightbulb, gradient: "from-yellow-500 to-amber-500" },
  { key: "incidents", label: "Incidents Handled", icon: AlertTriangle, gradient: "from-orange-500 to-red-500" },
];

const tierStyles: Record<string, string> = {
  bronze: "from-amber-600/20 to-orange-600/10 border-amber-600/30",
  silver: "from-slate-400/20 to-slate-300/10 border-slate-400/30",
  gold: "from-yellow-400/25 to-amber-500/15 border-yellow-500/40",
};

export default function WrappedPage() {
  const { data, isLoading } = useSWR<WrappedData>("/api/wrapped", fetcher);

  const badges = useMemo(
    () => (data?.stats ? computeBadges(data.stats) : []),
    [data?.stats]
  );
  const earned = badges.filter((b) => b.earned);

  if (isLoading || !data?.stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary animate-pulse glow" />
          <p className="text-sm text-muted-foreground animate-pulse">Wrapping up your season...</p>
        </div>
      </div>
    );
  }

  const { stats, highlights } = data;
  const firstName = data.name?.split(" ")[0] || "there";

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Hero */}
      <BlurFade delay={0.05} inView>
        <Card className="relative overflow-hidden mb-8">
          <BorderBeam size={140} duration={10} colorFrom="#3f6b52" colorTo="#c05f3c" />
          <div className="relative gradient-primary p-8 md:p-14 text-center text-white">
            <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-primary/40 via-accent/30 to-accent/40" />
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative text-5xl mb-3"
            >
              🎁
            </motion.div>
            <p className="relative text-sm uppercase tracking-[0.2em] text-white/80 mb-2">
              Your Residence Life
            </p>
            <SparklesText
              className="relative text-4xl md:text-6xl text-white"
              colors={{ first: "#fde68a", second: "#f9a8d4" }}
            >
              Wrapped
            </SparklesText>
            <p className="relative text-white/90 mt-4 max-w-md mx-auto">
              What a season, {firstName}. Here&apos;s everything you did for your floor. ✨
            </p>
          </div>
        </Card>
      </BlurFade>

      {/* Highlights */}
      {(highlights.topCategory || highlights.busiestMonth || highlights.biggestEvent) && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {highlights.busiestMonth && (
            <BlurFade delay={0.1} inView>
              <HighlightCard label="Busiest Month" value={highlights.busiestMonth} emoji="🔥" />
            </BlurFade>
          )}
          {highlights.topCategory && (
            <BlurFade delay={0.16} inView>
              <HighlightCard label="Signature Vibe" value={highlights.topCategory} emoji="⭐" />
            </BlurFade>
          )}
          {highlights.biggestEvent && (
            <BlurFade delay={0.22} inView>
              <HighlightCard
                label="Biggest Event"
                value={highlights.biggestEvent.title}
                sub={`${highlights.biggestEvent.attendance} attendees`}
                emoji="🏆"
              />
            </BlurFade>
          )}
        </div>
      )}

      {/* Stats grid */}
      <BlurFade delay={0.1} inView>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> By the numbers
        </h2>
      </BlurFade>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {STAT_META.map((meta, i) => {
          const value = stats[meta.key] ?? 0;
          return (
            <BlurFade key={meta.key} delay={0.12 + i * 0.05} inView>
              <Card className="h-full">
                <CardContent className="p-5">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                      meta.gradient
                    )}
                  >
                    <meta.icon className="h-5 w-5 text-white" />
                  </div>
                  <NumberTicker
                    value={value}
                    className="text-3xl font-bold gradient-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{meta.label}</p>
                </CardContent>
              </Card>
            </BlurFade>
          );
        })}
      </div>

      {/* Badges */}
      <BlurFade delay={0.15} inView>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Achievements
          </h2>
          <UIBadge variant="warning">
            {earned.length}/{badges.length} unlocked
          </UIBadge>
        </div>
      </BlurFade>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {badges.map((badge, i) => (
          <BlurFade key={badge.id} delay={0.16 + i * 0.04} inView>
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 h-full transition-all",
                badge.earned
                  ? cn("bg-gradient-to-br", tierStyles[badge.tier])
                  : "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] opacity-50"
              )}
            >
              {badge.earned && badge.tier === "gold" && (
                <BorderBeam size={60} duration={5} colorFrom="#fbbf24" colorTo="#f59e0b" />
              )}
              <div className="flex items-start gap-3">
                <span className={cn("text-3xl", !badge.earned && "grayscale")}>{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-black/90 dark:text-white/90">{badge.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{badge.desc}</p>
                  {!badge.earned && (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mt-2">
                      Locked
                    </p>
                  )}
                </div>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  sub,
  emoji,
}: {
  label: string;
  value: string;
  sub?: string;
  emoji: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5 flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-bold text-black/90 dark:text-white/90 truncate capitalize">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
