"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  event: { icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
  approval: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  team: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  resource: { icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10" },
  ai: { icon: Sparkles, color: "text-pink-400", bg: "bg-pink-500/10" },
  system: { icon: Settings, color: "text-muted-foreground", bg: "bg-white/[0.06]" },
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
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay up to date with your team</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            filter === "all"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            filter === "unread"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          {filtered.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;

            return (
              <motion.div key={notification.id} variants={item}>
                <div
                  className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    notification.read
                      ? "border-white/[0.06] bg-card/30 hover:bg-white/[0.03]"
                      : "border-purple-500/20 bg-purple-500/[0.03] hover:bg-purple-500/[0.05]"
                  }`}
                  onClick={() => markRead(notification.id)}
                >
                  <div className={`p-2.5 rounded-xl ${config.bg} shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5">{formatRelativeTime(notification.createdAt)}</p>
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
