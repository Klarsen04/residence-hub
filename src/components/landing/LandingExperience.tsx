"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  CalendarDays,
  Users,
  Sparkles,
  Coffee,
  BookOpen,
  Dumbbell,
  Trees,
  Moon,
  ArrowUpRight,
} from "lucide-react";
import { useGsapLenis } from "./useGsapLenis";
import { BuildingDiagram, FLOORS } from "./BuildingDiagram";
import { SignLabel, LevelMarker, DirectionArrow, Reveal } from "./wayfinding";

/* Content is illustrative of residence life — a welcoming, human sample. */

const TIMELINE = [
  { time: "MON · 19:00", where: "L01 · Community Kitchen", title: "Family Dinner Night", tag: "Food" },
  { time: "WED · 20:30", where: "R · Sky Lounge", title: "Rooftop Study Break", tag: "Wellness" },
  { time: "FRI · 21:00", where: "G · Lobby", title: "Floor Mixer & Games", tag: "Social" },
  { time: "SUN · 11:00", where: "Courtyard", title: "Slow Morning Brunch", tag: "Food" },
];

const SPACES = [
  { icon: Coffee, name: "Community Kitchen", code: "L01·A", note: "Where dinners happen" },
  { icon: BookOpen, name: "Quiet Study", code: "L03·C", note: "Focus floors" },
  { icon: Dumbbell, name: "Fitness Room", code: "G·B", note: "Open 24 hours" },
  { icon: Trees, name: "Courtyard", code: "OUT·1", note: "Sun & fresh air" },
  { icon: Moon, name: "Sky Lounge", code: "R·A", note: "Evenings & views" },
  { icon: Users, name: "Common Room", code: "L02·D", note: "Movie nights" },
];

const RESOURCES = [
  { label: "Maintenance request", code: "01" },
  { label: "Quiet hours & policies", code: "02" },
  { label: "Wellness & support", code: "03" },
  { label: "Laundry & mailroom", code: "04" },
  { label: "Emergency contacts", code: "05" },
  { label: "Move-out guide", code: "06" },
];

export function LandingExperience() {
  useGsapLenis();

  const heroRef = useRef<HTMLDivElement>(null);
  const buildingSectionRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Parallax for the hero title as you begin to descend.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTitleY = useTransform(heroProgress, [0, 1], [0, -120]);
  const heroFade = useTransform(heroProgress, [0, 0.8], [1, 0]);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      gsap.registerPlugin(ScrollTrigger);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      const section = buildingSectionRef.current;
      // Pin the building and light each floor as the visitor descends through it.
      const floors = gsap.utils.toArray<SVGGElement>(".floor-group");
      if (!section || floors.length === 0) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=" + floors.length * 320,
          scrub: 0.8,
          pin: ".building-pin",
          anticipatePin: 1,
        },
      });

      floors.forEach((floor, i) => {
        const windows = floor.querySelectorAll(".floor-window");
        const fill = floor.querySelector(".floor-fill");
        // GSAP's colour tween parser needs literal colours, not CSS var() refs.
        if (windows.length) {
          tl.to(windows, { fill: "hsl(42, 78%, 58%)", duration: 0.4 }, i * 0.5);
        }
        if (fill) {
          tl.to(fill, { fill: "hsla(152, 26%, 27%, 0.16)", duration: 0.4 }, i * 0.5);
        }
        tl.fromTo(
          `.floor-caption-${i}`,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.35 },
          i * 0.5
        );
        if (i > 0) {
          tl.to(`.floor-caption-${i - 1}`, { opacity: 0.25, duration: 0.3 }, i * 0.5);
        }
      });
    },
    { scope: buildingSectionRef }
  );

  return (
    <div className="bg-background text-foreground overflow-clip">
      {/* ============ HERO / WELCOME ============ */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex flex-col grid-lines"
      >
        {/* Top sign bar */}
        <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-semibold text-sm">RH</span>
            </div>
            <span className="font-display font-semibold text-lg">Residence Hub</span>
          </div>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg border border-black/[0.14] dark:border-white/[0.14] px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            Enter the building
            <DirectionArrow className="text-[hsl(var(--terracotta))] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-12 max-w-6xl">
          <motion.div style={{ y: heroTitleY, opacity: heroFade }}>
            <SignLabel code="52°N" className="mb-6">
              Now welcoming residents
            </SignLabel>
            <h1 className="font-display font-semibold tracking-tight text-[13vw] md:text-[8.5vw] leading-[0.92]">
              This is <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">a place.</span>
              <br />
              People live here.
            </h1>
            <p className="mt-8 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Residence Hub is the digital home of your residence hall — the floors,
              the faces, the front-desk and the Friday nights. Not a dashboard. A neighbourhood.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-sm shadow-black/15 hover:-translate-y-0.5 transition-transform"
              >
                Step inside
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <span className="wayfinding text-muted-foreground">Scroll to descend ↓</span>
            </div>
          </motion.div>
        </div>

        {/* Ground datum line */}
        <div className="relative z-10 px-6 md:px-12 pb-8">
          <div className="rule pt-4 flex items-center justify-between">
            <SignLabel>Est. community</SignLabel>
            <SignLabel code="↓">Level R — Ground</SignLabel>
          </div>
        </div>
      </section>

      {/* ============ YOUR RESIDENCE (pinned descent) ============ */}
      <section ref={buildingSectionRef} className="relative">
        <div className="building-pin min-h-[100svh] flex items-center grid-lines-fine">
          <div className="w-full max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center py-16">
            {/* The building */}
            <div className="relative">
              <BuildingDiagram ref={svgRef} className="max-w-sm mx-auto" />
            </div>

            {/* Floor captions revealed by the timeline */}
            <div className="relative">
              <LevelMarker level="01" label="Your Residence" />
              <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
                Five floors of
                <br />
                everyday life.
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-md">
                Descend through the building. Every level is somewhere people
                gather, rest, study and belong.
              </p>

              <ul className="mt-10 space-y-4">
                {FLOORS.map((floor, i) => (
                  <li
                    key={floor.id}
                    className={`floor-caption-${i} flex items-baseline gap-4`}
                  >
                    <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] w-8 tabular-nums">
                      {floor.code}
                    </span>
                    <span className="font-display text-lg">{floor.label}</span>
                    <span className="text-muted-foreground text-sm">— {floor.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHAT'S HAPPENING (timeline) ============ */}
      <section className="relative px-6 md:px-12 py-28 md:py-40">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <LevelMarker level="02" label="This Week in the Hall" />
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display font-semibold text-4xl md:text-6xl leading-tight max-w-3xl">
              What&apos;s happening,
              <br />
              floor by floor.
            </h2>
          </Reveal>

          <div className="mt-16 relative">
            {/* Vertical corridor line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-black/[0.12] dark:bg-white/[0.12]" />
            <div className="space-y-10">
              {TIMELINE.map((ev, i) => (
                <Reveal key={ev.title} delay={i * 0.06}>
                  <div className="relative pl-10 group">
                    <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-[hsl(var(--terracotta))] bg-background group-hover:bg-[hsl(var(--terracotta))] transition-colors" />
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="wayfinding text-muted-foreground">{ev.time}</span>
                      <span className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                        {ev.where}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-2xl md:text-3xl">{ev.title}</h3>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ YOUR COMMUNITY ============ */}
      <section className="relative px-6 md:px-12 py-28 md:py-40 bg-[hsl(var(--sage)/0.06)] dark:bg-[hsl(var(--sage)/0.08)]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <LevelMarker level="03" label="Your Community" />
          </Reveal>
          <div className="mt-6 grid md:grid-cols-2 gap-12 items-end">
            <Reveal>
              <h2 className="font-display font-semibold text-4xl md:text-6xl leading-tight">
                A hall is its
                <br />
                people.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Residents, RAs, announcements and the small moments in between.
                Residence Hub keeps the community connected — the roster, the
                check-ins, the shared boards — so no one on the floor feels like
                a stranger.
              </p>
            </Reveal>
          </div>

          {/* Resident tiles — a warm mosaic, not a data grid */}
          <div className="mt-16 grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => {
              const initials = ["AM", "JB", "KO", "RL", "SP", "TN", "DE", "MC", "YH", "GA", "PW", "LI"][i];
              const isAccent = i % 5 === 2;
              return (
                <Reveal key={i} delay={i * 0.03}>
                  <div
                    className={`aspect-square rounded-lg flex items-center justify-center font-display text-lg border ${
                      isAccent
                        ? "bg-[hsl(var(--terracotta)/0.14)] border-[hsl(var(--terracotta)/0.3)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]"
                        : "bg-card border-black/[0.08] dark:border-white/[0.08]"
                    }`}
                  >
                    {initials}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ EXPLORE YOUR SPACES ============ */}
      <section className="relative px-6 md:px-12 py-28 md:py-40">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <LevelMarker level="04" label="Explore Your Spaces" />
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display font-semibold text-4xl md:text-6xl leading-tight max-w-3xl">
              Rooms with a
              <br />
              purpose.
            </h2>
          </Reveal>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {SPACES.map((space, i) => (
              <Reveal key={space.name} delay={i * 0.04}>
                <div className="group h-full bg-card p-8 hover:bg-[hsl(var(--sage)/0.06)] transition-colors">
                  <div className="flex items-start justify-between">
                    <space.icon className="h-7 w-7 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.5} />
                    <span className="wayfinding text-muted-foreground">{space.code}</span>
                  </div>
                  <h3 className="mt-8 font-display text-2xl">{space.name}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">{space.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ RESOURCES ============ */}
      <section className="relative px-6 md:px-12 py-28 md:py-40 bg-[hsl(var(--charcoal)/0.03)] dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <LevelMarker level="05" label="Resources & Front Desk" />
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display font-semibold text-4xl md:text-6xl leading-tight">
              Everything you need,
              <br />
              at the desk.
            </h2>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 gap-x-12">
            {RESOURCES.map((r, i) => (
              <Reveal key={r.label} delay={i * 0.04}>
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-4 py-5 rule first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
                >
                  <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                    {r.code}
                  </span>
                  <span className="font-display text-xl flex-1">{r.label}</span>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER / LEAVING THE BUILDING ============ */}
      <footer className="relative px-6 md:px-12 py-24 grid-lines-fine border-t border-black/[0.1] dark:border-white/[0.1]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="font-display font-semibold text-5xl md:text-7xl leading-[0.95] max-w-3xl">
              This is their
              <br />
              digital <span className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">home.</span>
            </p>
          </Reveal>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-sm shadow-black/15 hover:-translate-y-0.5 transition-transform"
            >
              <Sparkles className="h-4 w-4" />
              Enter Residence Hub
            </Link>
            <div className="flex items-center gap-6 wayfinding text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" /> Open all year
              </span>
              <span>Residence Life</span>
            </div>
          </div>
          <div className="mt-16 rule pt-6 flex items-center justify-between">
            <span className="wayfinding text-muted-foreground">Residence Hub</span>
            <span className="wayfinding text-muted-foreground">You have arrived ✦</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
