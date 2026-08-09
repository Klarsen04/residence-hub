"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Lightbulb,
  BookOpen,
  Sparkles,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { Announcements } from "@/components/Announcements";
import { GettingStarted } from "@/components/GettingStarted";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Signage label used across the dashboard for the wayfinding language. */
function Sign({ code, children }: { code?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 wayfinding text-muted-foreground">
      {code && (
        <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
          {code}
        </span>
      )}
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: dashboardData } = useSWR("/api/dashboard", fetcher);

  const events = dashboardData?.events || [];
  const inspirations = dashboardData?.inspirations || [];
  const resources = dashboardData?.resources || [];

  const stats = [
    { label: "Upcoming events", value: events.length, code: "01" },
    { label: "Saved inspiration", value: inspirations.length, code: "02" },
    { label: "Shared resources", value: resources.length, code: "03" },
    {
      label: "On the floor",
      value: events.length + inspirations.length + resources.length,
      code: "04",
    },
  ];

  const quickActions = [
    { href: "/events/new", label: "Create an event", note: "Plan your next program", icon: Calendar },
    { href: "/ai-planner", label: "AI event planner", note: "Get AI-powered ideas", icon: Sparkles },
    { href: "/collaboration", label: "Team boards", note: "Collaborate with your team", icon: Users },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 max-w-6xl"
    >
      {/* ---- Directory header: you are here ---- */}
      <motion.div variants={item}>
        <Sign code="YOU ARE HERE">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Sign>
        <h1 className="mt-3 font-display font-semibold text-4xl md:text-5xl leading-tight">
          {getGreeting()},{" "}
          <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
            {session?.user?.name?.split(" ")[0] || "there"}
          </span>
          .
        </h1>
        <p className="text-muted-foreground mt-3 text-base max-w-xl">
          Here&apos;s what&apos;s happening across your floor today.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Announcements />
      </motion.div>

      <motion.div variants={item}>
        <GettingStarted />
      </motion.div>

      {/* ---- Wayfinding stat strip ---- */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card p-6">
            <span className="font-mono text-xs text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
              {stat.code}
            </span>
            <p className="mt-3 font-display text-4xl tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ---- Corridor: upcoming events as a timeline ---- */}
      <motion.div variants={item}>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">L1</span>
          <h2 className="font-display text-2xl">Upcoming events</h2>
          <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1]" />
          <Link
            href="/events"
            className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="border border-dashed border-black/[0.12] dark:border-white/[0.12] rounded-xl py-12 text-center">
            <Calendar className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No upcoming events on the floor yet.</p>
          </div>
        ) : (
          <div className="relative pl-1">
            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-black/[0.1] dark:bg-white/[0.1]" />
            <div className="space-y-1">
              {events.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group relative flex items-center gap-5 pl-10 pr-4 py-4 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[hsl(var(--terracotta))] bg-card group-hover:bg-[hsl(var(--terracotta))] transition-colors" />
                  <div className="text-center min-w-[48px]">
                    <p className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="font-display text-2xl leading-none">
                      {new Date(event.date).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(event.startTime)}
                      {event.hall && ` · ${event.hall.name}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {event.category.replace(/_/g, " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ---- Inspiration mosaic ---- */}
        <motion.div variants={item}>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">L2</span>
            <h2 className="font-display text-2xl">Inspiration</h2>
            <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1]" />
            <Link
              href="/inspiration"
              className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              Browse <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {inspirations.length === 0 ? (
            <div className="border border-dashed border-black/[0.12] dark:border-white/[0.12] rounded-xl py-12 text-center">
              <Lightbulb className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No saved inspiration yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {inspirations.map((insp: any) => (
                <Link
                  key={insp.id}
                  href="/inspiration"
                  className="aspect-square rounded-lg bg-card border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative group hover:border-[hsl(var(--terracotta)/0.4)] transition-colors"
                >
                  {insp.imageUrl ? (
                    <img
                      src={insp.imageUrl}
                      alt={insp.title || "Inspiration"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <Lightbulb className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground line-clamp-2">
                        {insp.title || insp.source}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* ---- Resources ---- */}
        <motion.div variants={item}>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">L3</span>
            <h2 className="font-display text-2xl">Resources</h2>
            <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1]" />
            <Link
              href="/resources"
              className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {resources.length === 0 ? (
            <div className="border border-dashed border-black/[0.12] dark:border-white/[0.12] rounded-xl py-12 text-center">
              <BookOpen className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No shared resources yet.</p>
            </div>
          ) : (
            <div>
              {resources.map((resource: any) => (
                <Link
                  key={resource.id}
                  href="/resources"
                  className="group flex items-center gap-4 py-4 rule first:border-t-0"
                >
                  <BookOpen className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{resource.title}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5">
                      {resource.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ---- Directory: quick actions ---- */}
      <motion.div variants={item}>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">G</span>
          <h2 className="font-display text-2xl">Directory</h2>
          <span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.1]" />
        </div>
        <div className="grid sm:grid-cols-3 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-card p-6 hover:bg-[hsl(var(--sage)/0.06)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <action.icon className="h-6 w-6 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.5} />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-6 font-display text-xl">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{action.note}</p>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
