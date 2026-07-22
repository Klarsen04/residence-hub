"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lightbulb, BookOpen, TrendingUp, Users, Sparkles, ArrowRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { Announcements } from "@/components/Announcements";
import { WeeklyDigest } from "@/components/WeeklyDigest";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: dashboardData } = useSWR("/api/dashboard", fetcher);

  const events = dashboardData?.events || [];
  const inspirations = dashboardData?.inspirations || [];
  const resources = dashboardData?.resources || [];

  const stats = [
    { label: "Upcoming Events", value: events.length, icon: Calendar, color: "from-purple-500 to-indigo-500" },
    { label: "Inspirations", value: inspirations.length, icon: Lightbulb, color: "from-amber-500 to-orange-500" },
    { label: "Resources", value: resources.length, icon: BookOpen, color: "from-emerald-500 to-teal-500" },
    { label: "Team Activity", value: "Active", icon: Users, color: "from-blue-500 to-cyan-500" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-7xl">
      <motion.div variants={item}>
        <h1 className="text-4xl font-bold">
          Welcome back,{" "}
          <span className="gradient-text">{session?.user?.name?.split(" ")[0] || "there"}</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Here&apos;s what&apos;s happening in your residence life community.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Announcements />
      </motion.div>

      <motion.div variants={item} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-0.5"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl -translate-y-4 translate-x-4 group-hover:opacity-20 transition-opacity`} />
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card className="h-full hover:border-white/[0.12]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Calendar className="h-4 w-4 text-purple-400" />
                </div>
                Upcoming Events
              </CardTitle>
              <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event: any) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-start justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group/item"
                    >
                      <div className="flex gap-3">
                        <div className="text-center min-w-[42px] p-2 rounded-lg bg-purple-500/10">
                          <p className="text-[10px] text-purple-400 uppercase font-semibold">
                            {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                          </p>
                          <p className="text-lg font-bold text-foreground leading-tight">
                            {new Date(event.date).getDate()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover/item:text-foreground transition-colors">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(event.startTime)}
                            {event.hall && ` • ${event.hall.name}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {event.category.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full hover:border-white/[0.12]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                Inspiration Feed
              </CardTitle>
              <Link href="/inspiration" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {inspirations.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No saved inspiration yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {inspirations.map((item: any) => (
                    <Link
                      key={item.id}
                      href="/inspiration"
                      className="aspect-square rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative group/img hover:border-purple-500/30 transition-all duration-300"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title || "Inspiration"}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <Lightbulb className="h-4 w-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground line-clamp-2">
                            {item.title || item.source}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full hover:border-white/[0.12]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                </div>
                Recent Resources
              </CardTitle>
              <Link href="/resources" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {resources.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No shared resources yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {resources.map((resource: any) => (
                    <div key={resource.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{resource.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {resource.type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <WeeklyDigest eventsCount={events.length} inspirationsCount={inspirations.length} />
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full hover:border-white/[0.12] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
            <CardHeader className="relative pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-2">
              <Link
                href="/events/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 transition-all duration-200 group/action"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Create Event</p>
                  <p className="text-[11px] text-muted-foreground">Plan your next program</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/action:text-foreground group-hover/action:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/ai-planner"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 transition-all duration-200 group/action"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI Event Planner</p>
                  <p className="text-[11px] text-muted-foreground">Get AI-powered suggestions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/action:text-foreground group-hover/action:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/collaboration"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 transition-all duration-200 group/action"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Team Boards</p>
                  <p className="text-[11px] text-muted-foreground">Collaborate with your team</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/action:text-foreground group-hover/action:translate-x-0.5 transition-all" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
