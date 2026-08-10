"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { useInstall } from "./useInstall";

const DISMISS_KEY = "rh-install-hint-dismissed";

// A small, dismissible "Add to Home Screen" nudge shown to mobile users who
// haven't installed. Android/Chrome gets a one-tap Install button; iOS Safari
// gets the manual Share → Add to Home Screen instructions (the only path iOS
// allows). Remembers dismissal so it isn't nagging.
export function InstallHint() {
  const { platform, installed, canPrompt, install } = useInstall();
  const [dismissed, setDismissed] = useState(true); // default hidden until we check

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  // Only show on mobile, when not already installed and not dismissed.
  const showable = !installed && !dismissed && (platform === "ios" || platform === "android");
  if (!showable) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 md:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-black/[0.1] dark:border-white/[0.12] bg-card shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-semibold text-sm">RH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg leading-tight">Install Residence Hub</p>
            {platform === "ios" ? (
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
                Tap <Share className="inline h-3.5 w-3.5" /> then
                <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add to Home Screen
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Add it to your home screen for one-tap access.</p>
            )}
            {platform === "android" && canPrompt && (
              <button
                onClick={install}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Install
              </button>
            )}
          </div>
          <button onClick={close} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
