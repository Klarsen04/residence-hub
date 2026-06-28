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
  DollarSign,
  Store,
  BookOpen,
  Sparkles,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Inspiration", href: "/inspiration", icon: Lightbulb },
  { name: "Decorations", href: "/decorations", icon: Palette },
  { name: "Budgets", href: "/budgets", icon: DollarSign },
  { name: "Vendors", href: "/vendors", icon: Store },
  { name: "Resources", href: "/resources", icon: BookOpen },
  { name: "AI Planner", href: "/ai-planner", icon: Sparkles },
  { name: "Collaboration", href: "/collaboration", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-background border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-xl font-bold text-primary">Residence Hub</h1>
            <p className="text-xs text-muted-foreground mt-1">Residence Life OS</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t space-y-1">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            {session?.user && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  {session.user.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.role?.replace("_", " ")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
