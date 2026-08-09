"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background grid-lines">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-primary animate-pulse glow-sm" />
          <p className="wayfinding text-muted-foreground animate-pulse">Finding your floor</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="h-screen overflow-hidden flex bg-background relative">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-60" />
      <CommandPalette />
      <Sidebar />
      {/* h-screen + overflow-hidden makes <main> a fixed-height viewport region.
          The inner wrapper is the scroller for normal (long) pages; a page that
          wants to own its own scrolling (e.g. the AI chat) can use h-full on its
          root and it will fill this box exactly instead of growing the page. */}
      <main className="flex-1 h-screen overflow-hidden relative z-10 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
