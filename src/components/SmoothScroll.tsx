"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * App-wide smooth scrolling. Lenis drives scroll position with inertia so
 * GSAP ScrollTrigger and Framer Motion scroll-linked animations feel like
 * physically moving through the building rather than snapping between cards.
 *
 * Respects prefers-reduced-motion by disabling smoothing entirely.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        duration: 1.2,
        smoothWheel: !prefersReduced,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  );
}
