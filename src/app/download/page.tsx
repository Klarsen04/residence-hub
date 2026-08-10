"use client";

import Link from "next/link";
import { Share, Plus, Download, MoreVertical, ArrowLeft, Check } from "lucide-react";
import { useInstall } from "@/components/pwa/useInstall";

const MARK = "font-mono uppercase tracking-[0.2em] text-[11px]";

export default function DownloadPage() {
  const { platform, installed, canPrompt, install } = useInstall();

  return (
    <div className="min-h-screen bg-background grid-lines">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className={`${MARK} text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-3`}>
          ✦ · GET THE APP
        </div>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.02]">
          Residence Hub,
          <br />
          on your home screen.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl text-lg">
          Install Residence Hub like a native app — full-screen, one tap from your home screen,
          no app store needed. It works on iPhone, Android, and desktop.
        </p>

        {installed ? (
          <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--sage)/0.3)] bg-[hsl(var(--sage)/0.1)] px-5 py-3 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">
            <Check className="h-5 w-5" /> Already installed — you&apos;re all set.
          </div>
        ) : canPrompt ? (
          <button
            onClick={install}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-base font-medium shadow-sm shadow-black/15 hover:-translate-y-0.5 transition-transform"
          >
            <Download className="h-5 w-5" /> Install app
          </button>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">Follow the steps for your device below.</p>
        )}

        {/* Per-platform instructions */}
        <div className="mt-12 grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
          <PlatformCard
            code="01"
            title="iPhone & iPad"
            active={platform === "ios"}
            steps={[
              <>Open this page in <strong>Safari</strong>.</>,
              <>Tap the <Share className="inline h-4 w-4 mx-0.5" /> Share button.</>,
              <>Choose <span className="inline-flex items-center gap-0.5 font-medium"><Plus className="h-4 w-4" /> Add to Home Screen</span>.</>,
              <>Tap <strong>Add</strong> — the RH icon appears on your home screen.</>,
            ]}
          />
          <PlatformCard
            code="02"
            title="Android"
            active={platform === "android"}
            steps={[
              <>Open this page in <strong>Chrome</strong>.</>,
              <>Tap the <MoreVertical className="inline h-4 w-4 mx-0.5" /> menu (top-right).</>,
              <>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>,
              <>Confirm — Residence Hub installs like a normal app.</>,
            ]}
          />
          <PlatformCard
            code="03"
            title="Desktop (Chrome / Edge)"
            active={platform === "desktop"}
            steps={[
              <>Look for the <Download className="inline h-4 w-4 mx-0.5" /> install icon in the address bar.</>,
              <>Click it, then <strong>Install</strong>.</>,
              <>Residence Hub opens in its own window, dock/taskbar included.</>,
            ]}
          />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Residence Hub is a Progressive Web App — it installs straight from the browser and
          updates automatically. No app store, no downloads to manage.
        </p>
      </div>
    </div>
  );
}

function PlatformCard({
  code,
  title,
  steps,
  active,
}: {
  code: string;
  title: string;
  steps: React.ReactNode[];
  active?: boolean;
}) {
  return (
    <div className={`bg-card p-6 ${active ? "ring-1 ring-inset ring-[hsl(var(--terracotta)/0.35)]" : ""}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">{code}</span>
        <h2 className="font-display text-2xl">{title}</h2>
        {active && (
          <span className="ml-auto text-[10px] font-mono uppercase tracking-wide text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] bg-[hsl(var(--sage)/0.12)] px-2 py-1 rounded-full">
            Your device
          </span>
        )}
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="shrink-0 h-5 w-5 rounded-full border border-black/[0.15] dark:border-white/[0.15] flex items-center justify-center text-[11px] text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-foreground/90">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
