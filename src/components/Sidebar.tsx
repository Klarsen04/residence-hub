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
  DollarSign,
  UserCircle,
  Sun,
  Moon,
  BarChart2,
  MessageSquare,
  StickyNote,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { name: "Events", href: "/events", icon: Calendar, group: "main" },
  { name: "AI Planner", href: "/ai-planner", icon: Sparkles, group: "main" },
  { name: "Collaboration", href: "/collaboration", icon: Users, group: "main" },
  { name: "Inspiration", href: "/inspiration", icon: Lightbulb, group: "content" },
  { name: "Decorations", href: "/decorations", icon: Palette, group: "content" },
  { name: "Resources", href: "/resources", icon: BookOpen, group: "content" },
  { name: "Notes", href: "/notes", icon: StickyNote, group: "content" },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle, group: "tools" },
  { name: "Budget", href: "/budget", icon: DollarSign, group: "tools" },
  { name: "Duty", href: "/duty", icon: ShieldCheck, group: "tools" },
  { name: "Polls", href: "/polls", icon: BarChart2, group: "tools" },
  { name: "Feedback", href: "/feedback", icon: MessageSquare, group: "tools" },
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
          "fixed inset-y-0 left-0 z-40 w-[280px] bg-card/90 backdrop-blur-xl border-r border-black/[0.06] dark:border-white/[0.06] transform transition-transform duration-300 ease-out md:translate-x-0 md:static md:inset-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center glow-sm">
                <span className="text-white font-bold text-sm">RH</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Residence Hub</h1>
                <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">Residence Life OS</p>
              </div>
            </div>
          </div>

          <div className="px-3 mb-3">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-muted-foreground hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left text-xs">Search...</span>
              <kbd className="hidden md:inline-flex text-[10px] font-mono border border-white/[0.1] bg-white/[0.04] rounded px-1 py-0.5">⌘K</kbd>
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
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                            isActive
                              ? "text-white"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute inset-0 rounded-xl gradient-primary opacity-90 glow-sm"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                          )}
                          <item.icon className={cn("h-4 w-4 relative z-10", isActive && "text-white")} />
                          <span className="relative z-10">{item.name}</span>
                          {item.name === "AI Planner" && !isActive && (
                            <span className="ml-auto relative z-10 h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/[0.06] space-y-0.5">
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === "/admin"
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 w-full"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {session?.user && (
              <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  {session.user.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.user.role?.replace("_", " ")}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
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
