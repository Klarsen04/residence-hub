"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, User } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categoryColors: Record<string, string> = {
  COMMUNITY_BUILDING: "bg-blue-100 text-blue-700",
  WELLNESS: "bg-green-100 text-green-700",
  ACADEMIC_SUCCESS: "bg-purple-100 text-purple-700",
  DIVERSITY_INCLUSION: "bg-orange-100 text-orange-700",
  CAREER_DEVELOPMENT: "bg-indigo-100 text-indigo-700",
  SUSTAINABILITY: "bg-emerald-100 text-emerald-700",
  LEADERSHIP: "bg-amber-100 text-amber-700",
  SOCIAL: "bg-pink-100 text-pink-700",
  SPIRITUAL_LIFE: "bg-cyan-100 text-cyan-700",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: event, isLoading } = useSWR(`/api/events/${params.id}`, fetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (!event || event.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" onClick={() => router.push("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/events")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <Badge className={statusColors[event.status] || ""}>
            {event.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <Badge className={categoryColors[event.category] || ""}>
          {event.category.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(event.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Organizer</p>
                <p className="font-medium">{event.organizer?.name || "Unknown"}</p>
              </div>
            </div>
          </div>

          {event.hall && (
            <div>
              <p className="text-sm text-muted-foreground">Hall</p>
              <p className="font-medium">{event.hall.name}</p>
            </div>
          )}

          {event.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{event.description}</p>
            </div>
          )}

          {event.reflection && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reflection</p>
              <p className="text-sm">{event.reflection}</p>
            </div>
          )}

          {event.attendance && (
            <div>
              <p className="text-sm text-muted-foreground">Attendance</p>
              <p className="font-medium">{event.attendance} residents</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
