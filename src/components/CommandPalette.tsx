"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Lightbulb,
  Palette,
  BookOpen,
  Sparkles,
  Users,
  BarChart3,
  Settings,
  Search,
  Shield,
  Bell,
  Plus,
  DollarSign,
  UserCircle,
} from "lucide-react";

const commands = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
  { name: "Events", href: "/events", icon: Calendar, category: "Navigation" },
  { name: "Inspiration", href: "/inspiration", icon: Lightbulb, category: "Navigation" },
  { name: "Decorations", href: "/decorations", icon: Palette, category: "Navigation" },
  { name: "Resources", href: "/resources", icon: BookOpen, category: "Navigation" },
  { name: "AI Planner", href: "/ai-planner", icon: Sparkles, category: "Navigation" },
  { name: "Collaboration", href: "/collaboration", icon: Users, category: "Navigation" },
  { name: "Floor Mixer", href: "/mixer", icon: Users, category: "Navigation" },
  { name: "Wrapped", href: "/wrapped", icon: Sparkles, category: "Navigation" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, category: "Navigation" },
  { name: "Notifications", href: "/notifications", icon: Bell, category: "Navigation" },
  { name: "Budget", href: "/budget", icon: DollarSign, category: "Navigation" },
  { name: "Floor Roster", href: "/residents", icon: UserCircle, category: "Navigation" },
  { name: "Check-Ins", href: "/check-ins", icon: UserCircle, category: "Navigation" },
  { name: "Room Checks", href: "/room-checks", icon: UserCircle, category: "Navigation" },
  { name: "Incidents", href: "/incidents", icon: Shield, category: "Navigation" },
  { name: "Duty Schedule", href: "/duty", icon: Shield, category: "Navigation" },
  { name: "Polls", href: "/polls", icon: UserCircle, category: "Navigation" },
  { name: "Feedback", href: "/feedback", icon: UserCircle, category: "Navigation" },
  { name: "Notes", href: "/notes", icon: UserCircle, category: "Navigation" },
  { name: "Team", href: "/team", icon: UserCircle, category: "Navigation" },
  { name: "Settings", href: "/settings", icon: Settings, category: "Navigation" },
  { name: "Admin", href: "/admin", icon: Shield, category: "Navigation" },
  { name: "Create New Event", href: "/events/new", icon: Plus, category: "Actions" },
  { name: "Event Templates", href: "/events/templates", icon: Sparkles, category: "Actions" },
  { name: "Log Incident", href: "/incidents", icon: Shield, category: "Actions" },
  { name: "AI Event Ideas", href: "/ai-planner", icon: Sparkles, category: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
      setQuery("");
      setSelectedIndex(0);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  const handleCustomOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [handleKeyDown, handleCustomOpen]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 top-[20%] z-[101] mx-auto w-full max-w-lg"
          >
            <div className="mx-4 overflow-hidden rounded-2xl border border-black/[0.1] dark:border-white/[0.1] bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search pages, actions..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[300px] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results found
                  </div>
                ) : (
                  <>
                    {["Navigation", "Actions"].map((category) => {
                      const items = filtered.filter((c) => c.category === category);
                      if (items.length === 0) return null;
                      return (
                        <div key={category}>
                          <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {category}
                          </p>
                          {items.map((cmd) => {
                            const idx = filtered.indexOf(cmd);
                            return (
                              <button
                                key={cmd.name + cmd.href}
                                onClick={() => navigate(cmd.href)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                  selectedIndex === idx
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <cmd.icon className={`h-4 w-4 ${selectedIndex === idx ? "text-primary" : ""}`} />
                                <span>{cmd.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              <div className="border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-2.5 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                  Navigate
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                  Select
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
