"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";

let registered = false;

/**
 * Bridges the app-wide Lenis smooth scroll to GSAP ScrollTrigger so pinned /
 * scrubbed choreography stays perfectly in step with the inertia scroll.
 * Without this, ScrollTrigger reads native scroll while Lenis animates its
 * own position and the two drift apart.
 */
export function useGsapLenis() {
  const lenis = useLenis();

  useEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    // Drive Lenis from GSAP's ticker for a single, jitter-free RAF loop.
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(ticker);
    };
  }, [lenis]);
}
