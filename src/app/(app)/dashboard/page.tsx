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
  Home,
  MessageCircle,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { Announcements } from "@/components/Announcements";
import { GettingStarted } from "@/components/GettingStarted";
import { PageHeader, SectionMarker, Plate, PlateRow, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The building directory — every destination as a numbered wall placard.
const DIRECTORY = [
  { code: "L1", href: "/events", label: "Events", note: "Programs & calendar", icon: Calendar },
  { code: "L2", href: "/residents", label: "Floor Roster", note: "Your residents", icon: Home },
  { code: "L2", href: "/check-ins", label: "Check-Ins", note: "1:1 conversations", icon: MessageCircle },
  { code: "L3", href: "/collaboration", label: "Collaboration", note: "Shared boards", icon: Users },
  { code: "L3", href: "/inspiration", label: "Inspiration", note: "Ideas & references", icon: Lightbulb },
  { code: "G", href: "/room-checks", label: "Room Checks", note: "Health & safety", icon: ClipboardCheck },
  { code: "G", href: "/duty", label: "Duty", note: "On-call schedule", icon: ShieldCheck },
  { code: "G", href: "/resources", label: "Resources", note: "Front-desk info", icon: BookOpen },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: dashboardData, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher);

  const events = dashboardData?.events || [];
  const inspirations = dashboardData?.inspirations || [];
  const resources = dashboardData?.resources || [];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl">
      {/* ---- Lobby header: you are here ---- */}
      <motion.div variants={item}>
        <PageHeader
          code={`YOU ARE HERE · ${today.toUpperCase()}`}
          title={
            <>
              {getGreeting()},{" "}
              <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">{firstName}</span>.
            </>
          }
          subtitle="Welcome back to the building. Here's what's happening across your floor today."
        />
      </motion.div>

      <motion.div variants={item} className="mb-8">
        <Announcements />
      </motion.div>

      <motion.div variants={item} className="mb-8">
        <GettingStarted />
      </motion.div>

      {error ? (
        <motion.div variants={item} className="mb-12">
          <EmptyPlate
            code="✦ · ERROR"
            title="Couldn't load the dashboard."
            hint={error.message}
            action={
              <button
                onClick={() => mutate()}
                className="rounded-lg border border-black/[0.12] dark:border-white/[0.12] px-4 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                Retry
              </button>
            }
          />
        </motion.div>
      ) : isLoading ? (
        <motion.div variants={item} className="mb-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-card animate-pulse" />
            ))}
          </div>
        </motion.div>
      ) : (
        <>
      {/* ---- At-a-glance plates ---- */}
      <motion.div variants={item} className="mb-12">
        <PlateRow className="grid-cols-2 lg:grid-cols-4">
          <Plate code="01" value={events.length} label="Upcoming events" accent />
          <Plate code="02" value={inspirations.length} label="Saved inspiration" />
          <Plate code="03" value={resources.length} label="Shared resources" />
          <Plate code="04" value={events.length + inspirations.length + resources.length} label="On the floor" />
        </PlateRow>
      </motion.div>

      {/* ---- Corridor: upcoming events as a departures-board timeline ---- */}
      <motion.div variants={item} className="mb-12">
        <SectionMarker
          code="L1"
          label="What's happening"
          right={
            <Link href="/events" className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {events.length === 0 ? (
          <EmptyPlate code="L1 · EMPTY" title="No events on the board yet" hint="Create your first program to see it here." icon={<Calendar className="h-7 w-7" strokeWidth={1.5} />} />
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
                    <p className="font-display text-2xl leading-none">{new Date(event.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(event.startTime)}
                      {event.hall && ` · ${event.hall.name}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{event.category.replace(/_/g, " ")}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ---- Inspiration + Resources ---- */}
      <div className="grid gap-10 lg:grid-cols-2 mb-12">
        <motion.div variants={item}>
          <SectionMarker
            code="L2"
            label="Inspiration"
            right={
              <Link href="/inspiration" className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
                Browse <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {inspirations.length === 0 ? (
            <EmptyPlate code="L2 · EMPTY" title="No inspiration saved" hint="Pin ideas from anywhere on the web." icon={<Lightbulb className="h-7 w-7" strokeWidth={1.5} />} />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {inspirations.map((insp: any) => (
                <Link
                  key={insp.id}
                  href="/inspiration"
                  className="aspect-square rounded-lg bg-card border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative group hover:border-[hsl(var(--terracotta)/0.4)] transition-colors"
                >
                  {insp.imageUrl ? (
                    <img src={insp.imageUrl} alt={insp.title || "Inspiration"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <Lightbulb className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground line-clamp-2">{insp.title || insp.source}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={item}>
          <SectionMarker
            code="L3"
            label="Resources"
            right={
              <Link href="/resources" className="wayfinding text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {resources.length === 0 ? (
            <EmptyPlate code="L3 · EMPTY" title="No resources shared" hint="Front-desk guides and links live here." icon={<BookOpen className="h-7 w-7" strokeWidth={1.5} />} />
          ) : (
            <div>
              {resources.map((resource: any) => (
                <Link key={resource.id} href="/resources" className="group flex items-center gap-4 py-4 rule first:border-t-0">
                  <BookOpen className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{resource.title}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5">{resource.type.replace(/_/g, " ")}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
        </>
      )}

      {/* ---- Building directory ---- */}
      <motion.div variants={item}>
        <SectionMarker code="✦" label="Building directory" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
          {DIRECTORY.map((d) => (
            <Link key={d.href} href={d.href} className="group bg-card p-5 hover:bg-[hsl(var(--sage)/0.06)] transition-colors">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">{d.code}</span>
                <d.icon className="h-5 w-5 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.5} />
              </div>
              <p className="mt-5 font-display text-lg">{d.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
