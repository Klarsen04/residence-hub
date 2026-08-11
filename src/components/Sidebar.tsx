"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
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
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Search,
  UserCircle,
  Sun,
  Moon,
  StickyNote,
  ShieldCheck,
  AlertTriangle,
  Home,
  ClipboardCheck,
  MessageCircle,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { name: "Events", href: "/events", icon: Calendar, group: "main" },
  { name: "Floor Roster", href: "/residents", icon: Home, group: "main" },
  { name: "Check-Ins", href: "/check-ins", icon: MessageCircle, group: "main" },
  { name: "AI Planner", href: "/ai-planner", icon: Sparkles, group: "main" },
  { name: "Offline AI", href: "/chat", icon: Bot, group: "main" },
  { name: "Collaboration", href: "/collaboration", icon: Users, group: "main" },
  { name: "Inspiration", href: "/inspiration", icon: Lightbulb, group: "content" },
  { name: "Decorations", href: "/decorations", icon: Palette, group: "content" },
  { name: "Resources", href: "/resources", icon: BookOpen, group: "content" },
  { name: "Notes", href: "/notes", icon: StickyNote, group: "content" },
  { name: "Room Checks", href: "/room-checks", icon: ClipboardCheck, group: "tools" },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle, group: "tools" },
  { name: "Duty", href: "/duty", icon: ShieldCheck, group: "tools" },
  { name: "Team", href: "/team", icon: UserCircle, group: "tools" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, group: "tools" },
  { name: "Notifications", href: "/notifications", icon: Bell, group: "tools" },
];

const groups = [
  { key: "main", label: null },
  { key: "content", label: "Content" },
  { key: "tools", label: "Tools" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-xl glass text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] bg-card/90 backdrop-blur-xl border-r border-black/[0.06] dark:border-white/[0.06] transform transition-transform duration-300 ease-out md:translate-x-0 md:sticky md:top-0 md:inset-auto md:h-screen md:self-start",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 pb-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center shadow-sm shadow-black/10 group-hover:-translate-y-0.5 transition-transform">
                <span className="text-primary-foreground font-display font-semibold text-sm">RH</span>
              </div>
              <div>
                <h1 className="text-lg font-display font-semibold text-foreground leading-tight">Residence Hub</h1>
                <p className="wayfinding text-muted-foreground">Residence Life</p>
              </div>
            </Link>
          </div>

          <div className="px-3 mb-3">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-command-palette"))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-sm text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left text-xs">Search...</span>
              <kbd className="hidden md:inline-flex text-[10px] font-mono border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.04] rounded px-1 py-0.5">⌘K</kbd>
            </button>
          </div>

          <nav className="flex-1 px-3 overflow-y-auto">
            {groups.map((group) => {
              const items = navigation.filter(n => n.group === group.key);
              return (
                <div key={group.key} className={group.label ? "mt-4" : ""}>
                  {group.label && (
                    <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute inset-0 rounded-lg bg-primary shadow-sm shadow-black/15"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                          )}
                          <item.icon className={cn("h-4 w-4 relative z-10", isActive && "text-primary-foreground")} />
                          <span className="relative z-10">{item.name}</span>
                          {item.name === "AI Planner" && !isActive && (
                            <span className="ml-auto relative z-10 h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.07] space-y-0.5">
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/admin"
                    ? "bg-accent/12 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-200 w-full"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {session?.user && (
              <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.06]">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  {session.user.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.user.role?.replace("_", " ")}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
