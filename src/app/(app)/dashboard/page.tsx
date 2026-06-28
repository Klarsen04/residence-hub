"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lightbulb, BookOpen } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: dashboardData } = useSWR("/api/dashboard", fetcher);

  const events = dashboardData?.events || [];
  const inspirations = dashboardData?.inspirations || [];
  const resources = dashboardData?.resources || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session?.user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening in your residence life community.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {events.map((event: any) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.date)} at {formatTime(event.startTime)}
                      </p>
                      {event.hall && (
                        <p className="text-xs text-muted-foreground">{event.hall.name}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {event.category.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/events" className="text-sm text-primary hover:underline mt-4 block">
              View all events
            </Link>
          </CardContent>
        </Card>


        {/* Inspiration Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Inspiration Feed</CardTitle>
            <Lightbulb className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {inspirations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved inspiration yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {inspirations.map((item: any) => (
                  <Link
                    key={item.id}
                    href="/inspiration"
                    className="aspect-square rounded-lg bg-muted overflow-hidden relative group"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title || "Inspiration"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <Lightbulb className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {item.title || item.source}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/inspiration" className="text-sm text-primary hover:underline mt-4 block">
              Browse inspiration
            </Link>
          </CardContent>
        </Card>

        {/* Resource Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Resources</CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared resources yet</p>
            ) : (
              <div className="space-y-2">
                {resources.map((resource: any) => (
                  <div key={resource.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/resources" className="text-sm text-primary hover:underline mt-4 block">
              View all resources
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
