"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Lightbulb,
  BarChart3,
  Activity,
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
import { PageHeader, SectionMarker, Plate, PlateRow } from "@/components/wayfinding/PageChrome";

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

// Shared card shell — a wall-mounted "readings" panel with a coded header.
function Panel({
  code,
  title,
  icon,
  children,
}: {
  code: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">{icon}</span>
        <div>
          <p className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">{code}</p>
          <h2 className="font-display text-xl leading-tight">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

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
    { code: "01", label: "Total Events", value: allEvents.length, accent: true },
    { code: "02", label: "Active Users", value: new Set(allEvents.map((e: any) => e.organizerId)).size || 1, accent: false },
    { code: "03", label: "Inspirations", value: allInspirations.length, accent: false },
    { code: "04", label: "Engagement", value: "High", accent: false },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl">
      <motion.div variants={item}>
        <PageHeader
          code="G · ANALYTICS"
          title="Analytics"
          subtitle="The building's readings — track your team's performance and engagement across the floor."
        />
      </motion.div>

      {/* ---- Readings at a glance ---- */}
      <motion.div variants={item} className="mb-12">
        <PlateRow className="grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Plate key={stat.label} code={stat.code} value={stat.value} label={stat.label} accent={stat.accent} />
          ))}
        </PlateRow>
      </motion.div>

      <motion.div variants={item}>
        <SectionMarker code="✦" label="Readings" />
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.div variants={item}>
          <Panel code="R1" title="Events by Category" icon={<BarChart3 className="h-5 w-5" strokeWidth={1.5} />}>
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
          </Panel>
        </motion.div>

        <motion.div variants={item}>
          <Panel code="R2" title="Monthly Activity" icon={<TrendingUp className="h-5 w-5" strokeWidth={1.5} />}>
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
          </Panel>
        </motion.div>

        <motion.div variants={item}>
          <Panel code="R3" title="Event Status" icon={<Activity className="h-5 w-5" strokeWidth={1.5} />}>
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
                      <span className="text-xs font-medium ml-auto tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No event data available yet
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div variants={item}>
          <Panel code="R4" title="Recent Activity" icon={<Lightbulb className="h-5 w-5" strokeWidth={1.5} />}>
            <div>
              {allEvents.slice(0, 5).map((event: any) => (
                <div key={event.id} className="group flex items-center gap-4 py-3 rule first:border-t-0">
                  <div className="h-8 w-8 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-[hsl(var(--sage)/0.1)] flex items-center justify-center text-[11px] font-display text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">
                    {event.organizer?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5">
                      {event.organizer?.name} · {new Date(event.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
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
          </Panel>
        </motion.div>
      </div>
    </motion.div>
  );
}
