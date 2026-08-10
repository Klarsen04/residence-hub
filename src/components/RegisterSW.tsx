"use client";

import { useEffect } from "react";

// Registers the service worker (required for PWA installability). Client-only,
// production-only to avoid interfering with dev HMR.
export function RegisterSW() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);
  return null;
}
