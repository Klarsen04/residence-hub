"use client";

// Floor Mixer — a resident-matching mixer, cloned in spirit from Ctrl+Meet.
// Flow: playful "vibe check" survey → Kindred↔Chaos variety dial → a ranked
// "match drop" of residents to introduce, each with why-you-matched reasons.
// Runs 100% client-side over a mock resident pool — no backend, no AWS.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles, Users, Heart, RefreshCw, ChevronLeft, Check,
  PartyPopper, Coffee, Wand2, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";
import { QUESTIONS } from "@/lib/mixer/questions";
import { buildMockPool } from "@/lib/mixer/mockPool";
import { rankedMatches, type Person, type RankedMatch } from "@/lib/mixer/matching";

type Stage = "intro" | "survey" | "results";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function MixerPage() {
  const pool = useMemo(() => buildMockPool(), []);
  const [stage, setStage] = useState<Stage>("intro");

  // survey state
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [chaos, setChaos] = useState(0.35);

  // results state
  const [temperature, setTemperature] = useState(0.35);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  const total = QUESTIONS.length;
  const onBonus = step === total;
  const current = onBonus ? null : QUESTIONS[step];
  const progress = (step / total) * 100;

  const me: Person = useMemo(
    () => ({ id: "me", name: "You", answers, interests: [] }),
    [answers]
  );

  const matches: RankedMatch[] = useMemo(() => {
    if (stage !== "results") return [];
    return rankedMatches(me, pool, 6, { temperature, boosts: nudged });
  }, [stage, me, pool, temperature, nudged]);

  function pickAnswer(optionId: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    setTimeout(() => setStep((s) => s + 1), 200);
  }

  function seeMatches() {
    setTemperature(chaos);
    setStage("results");
    toast.success("Your floor matches are ready! 🎉");
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        toast.success("Introduction queued — say hi at the next floor event!");
      }
      return next;
    });
  }

  function toggleNudge(id: string) {
    setNudged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        toast("💫 Nudged — this resident will surface more often.");
      }
      return next;
    });
  }

  function restart() {
    setStage("intro");
    setStep(0);
    setAnswers({});
    setChaos(0.35);
    setPicked(new Set());
    setNudged(new Set());
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center glow-sm">
            <PartyPopper className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Floor Mixer</h1>
            <p className="text-sm text-muted-foreground">
              Match residents for coffee, study buddies & new friends ✨
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ───────── INTRO ───────── */}
        {stage === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="relative gradient-primary p-8 md:p-12 text-center text-white">
                <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-primary/40 via-accent/30 to-accent/40" />
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative text-6xl mb-4"
                >
                  🤝
                </motion.div>
                <h2 className="relative text-2xl md:text-3xl font-bold mb-2">
                  Help your floor actually meet each other
                </h2>
                <p className="relative text-white/90 max-w-lg mx-auto text-sm md:text-base">
                  Take a 10-question vibe check and we&apos;ll pair residents who&apos;d genuinely
                  click — a study buddy, a coffee run, a new friend down the hall.
                </p>
              </div>
              <CardContent className="p-6 md:p-8">
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Wand2, title: "Vibe check", desc: "10 playful questions, no pressure" },
                    { icon: Sparkles, title: "Smart matching", desc: "Beyond hobbies — real compatibility" },
                    { icon: Coffee, title: "Meet up", desc: "Introduce matches at floor events" },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-4 text-center"
                    >
                      <f.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="font-semibold text-sm text-black/90 dark:text-white/90">{f.title}</p>
                      <p className="text-xs text-black/50 dark:text-white/50 mt-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={() => setStage("survey")}>
                  Start the vibe check <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ───────── SURVEY ───────── */}
        {stage === "survey" && (
          <motion.div
            key="survey"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                {/* progress bar */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => (step === 0 ? setStage("intro") : setStep((s) => s - 1))}
                    className="p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="relative flex-1 h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 gradient-primary rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ type: "spring", bounce: 0.2 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {onBonus ? "✨ bonus" : `${String(step + 1).padStart(2, "0")}/${total}`}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {onBonus ? (
                    /* Chaos dial */
                    <motion.div
                      key="bonus"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                    >
                      <span className="text-xs font-mono uppercase tracking-wider text-primary">
                        ✦ last one
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold mt-2 mb-1 text-black/90 dark:text-white/90">
                        How adventurous should the matches be?
                      </h2>
                      <p className="text-sm text-muted-foreground mb-8">
                        Slide it, then see your floor. Kindred = closest fits · Chaos = pleasant surprises.
                      </p>
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-6">
                        <div className="flex justify-between text-sm font-medium mb-3">
                          <span>🧘 Kindred</span>
                          <span className="text-primary text-xs self-center">
                            {chaos < 0.25
                              ? "safe, closest matches"
                              : chaos > 0.7
                              ? "wildcard energy ✨"
                              : "a little serendipity"}
                          </span>
                          <span>Chaos 🎲</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={chaos}
                          onChange={(e) => setChaos(Number(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                          aria-label="Match variety from kindred to chaos"
                        />
                      </div>
                      <Button size="lg" className="w-full mt-8" onClick={seeMatches}>
                        See my floor matches <Sparkles className="h-4 w-4 ml-1" />
                      </Button>
                    </motion.div>
                  ) : (
                    /* Question */
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                    >
                      <span className="text-xs font-mono uppercase tracking-wider text-primary">
                        ✦ vibe check
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold mt-2 mb-6 text-black/90 dark:text-white/90">
                        {current!.q}
                      </h2>
                      <div className="space-y-3">
                        {current!.options.map((opt) => {
                          const isPicked = answers[current!.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => pickAnswer(opt.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
                                isPicked
                                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                                  : "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-primary/40 hover:bg-primary/[0.04]"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold uppercase",
                                  isPicked
                                    ? "gradient-primary text-white"
                                    : "bg-black/[0.05] dark:bg-white/[0.06] text-muted-foreground"
                                )}
                              >
                                {isPicked ? <Check className="h-4 w-4" /> : opt.id}
                              </span>
                              <span className="text-sm text-black/80 dark:text-white/80">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ───────── RESULTS / MATCH DROP ───────── */}
        {stage === "results" && (
          <motion.div key="results" variants={container} initial="hidden" animate="show">
            {/* live chaos dial + reshuffle */}
            <motion.div variants={item}>
              <Card className="mb-6">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Heart className="h-5 w-5 text-accent shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-black/90 dark:text-white/90">
                        {matches.length} matches for your floor
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-muted-foreground">🧘 Kindred</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={temperature}
                          onChange={(e) => setTemperature(Number(e.target.value))}
                          className="flex-1 accent-primary cursor-pointer max-w-[220px]"
                          aria-label="Adjust match variety"
                        />
                        <span className="text-[11px] text-muted-foreground">Chaos 🎲</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={restart}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retake
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {matches.length === 0 ? (
              <motion.div variants={item}>
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    No matches yet — try nudging the chaos dial or retaking the vibe check.
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {matches.map((m, i) => (
                  <MatchCard
                    key={m.person.id}
                    match={m}
                    featured={i === 0}
                    picked={picked.has(m.person.id)}
                    nudged={nudged.has(m.person.id)}
                    onPick={() => togglePick(m.person.id)}
                    onNudge={() => toggleNudge(m.person.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatchCard({
  match,
  featured,
  picked,
  nudged,
  onPick,
  onNudge,
}: {
  match: RankedMatch;
  featured?: boolean;
  picked: boolean;
  nudged: boolean;
  onPick: () => void;
  onNudge: () => void;
}) {
  const { person, score, reasons } = match;
  const pct = Math.round(score * 100);

  return (
    <motion.div variants={item} layout>
      <Card className={cn("relative h-full overflow-hidden transition-all", picked && "ring-2 ring-primary/60")}>
        {featured && <BorderBeam size={90} duration={7} colorFrom="#3f6b52" colorTo="#c05f3c" />}
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-xl shrink-0 glow-sm">
              {person.avatar || person.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-black/90 dark:text-white/90 truncate">{person.name}</p>
                {match.nudged && <Badge variant="warning">nudged</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Room {person.room} · {person.year}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold gradient-text leading-none">{pct}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">match</p>
            </div>
          </div>

          {/* match bar */}
          <div className="mt-3 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {/* why you matched */}
          {reasons.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 flex-wrap">
                  {r.kind === "interest" && (
                    <>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Both love</span>
                      {r.shared.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </>
                  )}
                  {r.kind === "year" && (
                    <Badge variant="secondary">Same year · {r.shared[0]}</Badge>
                  )}
                  {r.kind === "survey" && (
                    <span className="text-[11px] text-muted-foreground">
                      ✦ Answered alike: {r.shared[0]?.replace(/\?.*$/, "?")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={picked ? "secondary" : "default"}
              size="sm"
              className="flex-1"
              onClick={onPick}
            >
              {picked ? <><Check className="h-3.5 w-3.5 mr-1" /> Queued</> : "Introduce ✓"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNudge}
              className={cn(nudged && "border-amber-500/60 text-amber-500")}
              aria-label="Nudge this match"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
