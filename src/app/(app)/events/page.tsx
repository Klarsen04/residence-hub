"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categoryColors: Record<string, string> = {
  COMMUNITY_BUILDING: "bg-accent/15 text-accent border-accent/20",
  WELLNESS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ACADEMIC_SUCCESS: "bg-primary/15 text-primary border-primary/20",
  DIVERSITY_INCLUSION: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  CAREER_DEVELOPMENT: "bg-primary/15 text-primary border-primary/20",
  SUSTAINABILITY: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  LEADERSHIP: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SOCIAL: "bg-accent/15 text-accent border-accent/20",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground",
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-accent/15 text-accent",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: events, isLoading } = useSWR("/api/events/all", fetcher);

  const filteredEvents = (events || []).filter((e: any) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => {
    return filteredEvents.filter((e: any) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl"
    >
      <PageHeader
        code="01 · EVENTS"
        title="The Event Board"
        subtitle="United calendar — every program across the building, on one board."
        action={
          <div className="flex gap-2">
            <Link href="/events/templates">
              <Button variant="outline">Templates</Button>
            </Link>
            <Link href="/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03]">
          <Button
            variant={view === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
            className="rounded-md"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="rounded-md"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] animate-pulse">
            Reading the board…
          </div>
        </div>
      ) : view === "calendar" ? (
        <div>
          <SectionMarker
            code={`${String(month + 1).padStart(2, "0")}`}
            label={`${MONTHS[month]} ${year}`}
            right={
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-lg h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-lg h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            }
          />

          <div className="grid grid-cols-7 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {DAYS.map((day) => (
              <div key={day} className="bg-card py-2.5 text-center wayfinding text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card/50 p-2 min-h-[96px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();
              return (
                <div
                  key={day}
                  className={`bg-card p-2 min-h-[96px] transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
                    isToday ? "bg-[hsl(var(--terracotta)/0.07)]" : ""
                  }`}
                >
                  <span
                    className={`font-display text-lg leading-none tabular-nums ${
                      isToday
                        ? "text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1.5 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event: any) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 font-medium ${
                            categoryColors[event.category]?.split(" ").slice(0, 2).join(" ") || "bg-primary/15 text-primary"
                          }`}
                        >
                          {event.title}
                        </div>
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyPlate
          code="01 · EMPTY"
          title="Nothing on the board"
          hint="No events match your search yet. Post the first one and it'll show up here."
          icon={<CalendarIcon className="h-7 w-7" strokeWidth={1.5} />}
          action={
            <Link href="/events/new">
              <Button variant="outline">Create your first event</Button>
            </Link>
          }
        />
      ) : (
        <div>
          <SectionMarker code="↓" label="Departures" right={<span className="wayfinding text-muted-foreground">{filteredEvents.length} listed</span>} />
          <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {filteredEvents.map((event: any, index: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="group flex items-center gap-5 px-5 py-4 bg-card border-t border-black/[0.08] dark:border-white/[0.08] first:border-t-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="text-center min-w-[56px] shrink-0">
                    <p className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="font-display text-3xl leading-none tabular-nums">
                      {new Date(event.date).getDate()}
                    </p>
                  </div>
                  <span className="h-10 w-px bg-black/[0.1] dark:bg-white/[0.1] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      {event.location && ` · ${event.location}`}
                    </p>
                    <p className="wayfinding text-muted-foreground mt-0.5">
                      {event.organizer?.name}{event.hall ? ` — ${event.hall.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={categoryColors[event.category] || ""}>
                      {event.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={statusColors[event.status] || ""}>
                      {event.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
