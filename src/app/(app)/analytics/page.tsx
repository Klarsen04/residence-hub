"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import {
  Calendar,
  Users,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

// Warm architectural chart palette — sage, terracotta, clay, ochre, olive.
const CHART_COLORS = ["#3f6b52", "#c05f3c", "#7a9b6e", "#d99a3e", "#9c5a3c", "#5f7d6b", "#e0b15a", "#4a5d4f"];

export default function AnalyticsPage() {
  const { data: events } = useSWR("/api/events/all", fetcher);
  const { data: inspirations } = useSWR("/api/inspiration", fetcher);

  const allEvents = events || [];
  const allInspirations = inspirations || [];

  const categoryData = allEvents.reduce((acc: any[], event: any) => {
    const existing = acc.find((c: any) => c.name === event.category?.replace(/_/g, " "));
    if (existing) {
      existing.count += 1;
    } else if (event.category) {
      acc.push({ name: event.category.replace(/_/g, " "), count: 1 });
    }
    return acc;
  }, []);

  const monthlyData = allEvents.reduce((acc: any[], event: any) => {
    const date = new Date(event.date);
    const monthKey = date.toLocaleDateString("en-US", { month: "short" });
    const existing = acc.find((m: any) => m.month === monthKey);
    if (existing) {
      existing.events += 1;
    } else {
      acc.push({ month: monthKey, events: 1 });
    }
    return acc;
  }, []);

  const statusData = allEvents.reduce((acc: any[], event: any) => {
    const existing = acc.find((s: any) => s.name === event.status?.replace(/_/g, " "));
    if (existing) {
      existing.value += 1;
    } else if (event.status) {
      acc.push({ name: event.status.replace(/_/g, " "), value: 1 });
    }
    return acc;
  }, []);

  const stats = [
    {
      label: "Total Events",
      value: allEvents.length,
      change: "+12%",
      positive: true,
      icon: Calendar,
      color: "from-primary to-primary",
    },
    {
      label: "Active Users",
      value: new Set(allEvents.map((e: any) => e.organizerId)).size || 1,
      change: "+5%",
      positive: true,
      icon: Users,
      color: "from-accent to-[hsl(var(--sage-soft))]",
    },
    {
      label: "Inspirations",
      value: allInspirations.length,
      change: "+8%",
      positive: true,
      icon: Lightbulb,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Engagement",
      value: "High",
      change: "+23%",
      positive: true,
      icon: Activity,
      color: "from-emerald-500 to-[hsl(var(--sage-soft))]",
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your team&apos;s performance and engagement</p>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:-translate-y-0.5"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.07] rounded-full blur-2xl -translate-y-6 translate-x-6 group-hover:opacity-[0.12] transition-opacity`} />
            <div className="flex items-center justify-between mb-3">
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.positive ? "text-emerald-400" : "text-red-400"}`}>
                {stat.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Events by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,30,20,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(28 9% 40%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(28 9% 40%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(42 46% 98%)", border: "1px solid hsl(34 20% 85%)", color: "hsl(25 18% 14%)", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                      labelStyle={{ color: "hsl(25 18% 14%)" }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3f6b52" />
                        <stop offset="100%" stopColor="#c05f3c" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Create events to see category breakdown
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                Monthly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,30,20,0.08)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(28 9% 40%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(28 9% 40%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(42 46% 98%)", border: "1px solid hsl(34 20% 85%)", color: "hsl(25 18% 14%)", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                      labelStyle={{ color: "hsl(25 18% 14%)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="events"
                      stroke="#3f6b52"
                      strokeWidth={2.5}
                      dot={{ fill: "#3f6b52", strokeWidth: 0, r: 4 }}
                      activeDot={{ fill: "#3f6b52", strokeWidth: 2, stroke: "hsl(42 46% 98%)", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Create events to see monthly trends
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                Event Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(42 46% 98%)", border: "1px solid hsl(34 20% 85%)", color: "hsl(25 18% 14%)", borderRadius: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusData.map((s: any, i: number) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                        <span className="text-xs font-medium ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No event data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allEvents.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white">
                      {event.organizer?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {event.organizer?.name} • {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {event.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
                {allEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No activity yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
