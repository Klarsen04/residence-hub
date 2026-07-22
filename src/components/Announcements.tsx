"use client";

import { useState } from "react";
import { X, AlertTriangle, Info, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement {
  id: string;
  type: "info" | "warning" | "celebration";
  title: string;
  message: string;
}

const announcements: Announcement[] = [
  {
    id: "1",
    type: "info",
    title: "Tip: Use Cmd+K to navigate quickly",
    message: "Press Cmd+K (or Ctrl+K) to open the command palette and jump to any page instantly.",
  },
];

const typeConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-500/[0.08] border-blue-500/20",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/[0.08] border-amber-500/20",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  celebration: {
    icon: PartyPopper,
    bg: "bg-purple-500/[0.08] border-purple-500/20",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
  },
};

export function Announcements() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      {visible.map((announcement) => {
        const config = typeConfig[announcement.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`flex items-start gap-3 p-4 rounded-2xl border ${config.bg}`}
          >
            <div className={`p-2 rounded-xl ${config.iconBg} shrink-0`}>
              <Icon className={`h-4 w-4 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{announcement.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{announcement.message}</p>
            </div>
            <button
              onClick={() => setDismissed([...dismissed, announcement.id])}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
