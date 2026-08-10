"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { InstallHint } from "@/components/pwa/InstallHint";

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
    <div className="min-h-screen flex bg-background relative">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-60" />
      <CommandPalette />
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8 relative z-10">
        {children}
      </main>
      <InstallHint />
    </div>
  );
}
