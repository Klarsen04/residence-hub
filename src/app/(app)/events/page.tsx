"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categoryColors: Record<string, string> = {
  COMMUNITY_BUILDING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  WELLNESS: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ACADEMIC_SUCCESS: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  DIVERSITY_INCLUSION: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  CAREER_DEVELOPMENT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  SUSTAINABILITY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  LEADERSHIP: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  SOCIAL: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  SPIRITUAL_LIFE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">United calendar — all staff events in one place</p>
        </div>
        <Link href="/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={view === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading events...</div>
      ) : view === "calendar" ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold">
                {MONTHS[month]} {year}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {DAYS.map((day) => (
                <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />
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
                    className={`bg-background p-1 min-h-[80px] ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event: any) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <div
                            className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${
                              categoryColors[event.category]?.split(" ").slice(0, 2).join(" ") || "bg-primary/10"
                            }`}
                          >
                            {event.title}
                          </div>
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No events found</p>
            <Link href="/events/new">
              <Button variant="outline" className="mt-4">
                Create your first event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event: any) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-xs text-muted-foreground uppercase">
                        {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-2xl font-bold">
                        {new Date(event.date).getDate()}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        {event.location && ` | ${event.location}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.organizer?.name}{event.hall ? ` — ${event.hall.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[event.category] || ""}>
                      {event.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={statusColors[event.status] || ""}>
                      {event.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
