"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Users,
  Sparkles,
  BookOpen,
  Settings,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, EmptyPlate } from "@/components/wayfinding/PageChrome";

interface Notification {
  id: string;
  type: "event" | "approval" | "team" | "resource" | "ai" | "system";
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

const typeConfig = {
  event: { icon: Calendar, color: "text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" },
  approval: { icon: CheckCircle2, color: "text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" },
  team: { icon: Users, color: "text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" },
  resource: { icon: BookOpen, color: "text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" },
  ai: { icon: Sparkles, color: "text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" },
  system: { icon: Settings, color: "text-muted-foreground" },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, mutate } = useSWR<Notification[]>("/api/notifications", fetcher);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    mutate();
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    });
    mutate();
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, {
      method: "DELETE",
    });
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl"
    >
      <PageHeader
        code={`G · NOTIFICATIONS${unreadCount > 0 ? ` · ${unreadCount} NEW` : ""}`}
        title="Notifications"
        subtitle="The front-desk log — every message that came in for your floor."
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-6 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`wayfinding pb-1.5 border-b-2 transition-colors ${
            filter === "all"
              ? "border-[hsl(var(--terracotta))] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`wayfinding pb-1.5 border-b-2 transition-colors ${
            filter === "unread"
              ? "border-[hsl(var(--terracotta))] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyPlate
          code="G · EMPTY"
          title="No notifications yet"
          hint="Messages for your floor will land here at the front desk."
          icon={<Bell className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-card"
        >
          {filtered.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;

            return (
              <motion.div key={notification.id} variants={item}>
                <div
                  className={`group flex items-start gap-4 p-4 rule first:border-t-0 cursor-pointer transition-colors ${
                    notification.read
                      ? "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      : "bg-[hsl(var(--terracotta)/0.04)] hover:bg-[hsl(var(--terracotta)/0.07)]"
                  }`}
                  onClick={() => markRead(notification.id)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--terracotta))] dark:bg-[hsl(var(--terracotta-soft))]" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                    <p className="wayfinding text-muted-foreground/70 mt-1.5">{formatRelativeTime(notification.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
