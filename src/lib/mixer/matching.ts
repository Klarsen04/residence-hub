// Floor Mixer matching engine.
//
// A faithful TypeScript port of Ctrl+Meet's client-side matching engine,
// re-themed for residence life and stripped of every AWS dependency:
//   - No Bedrock/Titan embeddings. Ctrl+Meet used them only for free-text
//     semantic similarity and skipped that term when no embedding was present;
//     we simply never have one, so the pipeline is identical minus that term.
//   - No SigV4 / backend. Everything runs in the browser over a resident pool.
//
// WHAT IT OPTIMIZES FOR
// The vibe-check answers are the core matching signal, not just shared interest
// tags. Two residents rank high because they answered alike on questions that
// matter, not because their hobby tags happened to overlap. It stays PLATONIC
// (coffee/study/food friends) and adds controlled serendipity so matches feel a
// little magical, plus an anti-clone layer so identical-answer residents don't
// cluster into a same-vibe echo chamber.
//
// THE PIPELINE (per candidate, then across the slate):
//   1. per-question similarity (same answer = 1, else 0)
//   2. Gower similarity: weighted avg of the questions + interest Jaccard,
//      weighted by a research prior × an entropy weight (a question the whole
//      floor answers the same way carries ~0 signal, IDF-style)
//   3. same-room / roommate soft handling + blocklist HARD GATE
//   4. z-score across the user's candidates, then temperature-softmax +
//      Gumbel-top-k sampling for a serendipitous but monotone shortlist
//   5. MMR de-clone so the slate is varied, not five copies of one vibe
//
// See Ctrl+Meet (Harmony-ctrlmeet/src/matching.js) for the original theory +
// citations (Gower similarity, entropy/IDF weighting, softmax/Gumbel-top-k
// [Kool et al. 2019], MMR [Carbonell & Goldstein 1998], weak ties [Granovetter]).

import { QUESTIONS } from "./questions";

export interface Person {
  id: string;
  name: string;
  room?: string;
  year?: string;
  major?: string;
  avatar?: string; // emoji or initial
  answers?: Record<string, string>;
  interests?: string[];
  blocklist?: string[]; // ids the person never wants matched with
}

export interface MatchReason {
  kind: "interest" | "survey" | "year";
  shared: string[];
}

export interface RankedMatch {
  person: Person;
  score: number; // honest compatibility 0..1
  reasons: MatchReason[];
  nudged?: boolean;
}

// ---- Research-prior weights per question ----------------------------------
// Loosely grounded in friendship-assortment data (values/humor assort strongly;
// raw preference weakly). Weight humor/values questions higher than logistics.
const Q_PRIOR: Record<string, number> = {
  humor: 3,
  energy: 3,
  hangout: 3,
  weekend: 2,
  comfort: 2,
  study: 2,
  adventure: 2,
  night: 1,
  food: 1,
  room: 1,
};
const Q_IDS = QUESTIONS.map((q) => q.id);

const INTEREST_WEIGHT = 2; // interest-tag overlap vs a single question
const SAT_PERCENTILE = 0.9; // similarity cap at the cohort's 90th pct
const T_FLOOR = 0.15; // temperature floor ("Kindred" end stays close to true ranking)
const T_MAX = 1.8; // temperature ceiling at the "Chaos" end
const MMR_LAMBDA = 0.75; // 1 = pure relevance, 0 = pure variety
const NUDGE_BOOST = 1.2; // z-score bump for an RA-nominated pairing

// ---- small helpers --------------------------------------------------------
function jaccard(a: string[] = [], b: string[] = []): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

// Deterministic PRNG so a user's slate is stable across re-renders and only
// reshuffles when the temperature (chaos) dial moves.
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---- entropy auto-weighting (one pass over the pool) ----------------------
// A question everyone answers the same way can't tell people apart (like a
// stopword), so it gets ~0 weight; a question that splits the floor gets more.
function entropyWeights(people: Person[]): Record<string, number> {
  const w: Record<string, number> = {};
  for (const q of Q_IDS) {
    const counts: Record<string, number> = {};
    let n = 0;
    for (const p of people) {
      const a = p.answers?.[q];
      if (a != null) {
        counts[a] = (counts[a] || 0) + 1;
        n++;
      }
    }
    let H = 0;
    if (n > 0) {
      for (const c of Object.values(counts)) {
        const pk = c / n;
        H -= pk * Math.log(pk);
      }
    }
    const maxH = Math.log(Math.max(2, Object.keys(counts).length));
    w[q] = 0.15 + (maxH > 0 ? H / maxH : 0);
  }
  return w;
}

// ---- per-question partial similarity --------------------------------------
function qSim(ai?: string, aj?: string): number | null {
  if (ai == null || aj == null) return null;
  return ai === aj ? 1 : 0;
}

// ---- Gower similarity: one 0..1 number over mixed signals ------------------
export function gowerSimilarity(a: Person, b: Person, entW?: Record<string, number>): number {
  let num = 0;
  let den = 0;
  for (const q of Q_IDS) {
    const s = qSim(a.answers?.[q], b.answers?.[q]);
    if (s === null) continue;
    const w = (Q_PRIOR[q] ?? 1) * (entW?.[q] ?? 1);
    num += w * s;
    den += w;
  }
  const inter = jaccard(a.interests, b.interests);
  num += INTEREST_WEIGHT * inter;
  den += INTEREST_WEIGHT;
  return den > 0 ? num / den : 0;
}

function blocked(list: string[] | undefined, other: Person): boolean {
  if (!Array.isArray(list) || !list.length) return false;
  return list.includes(other.id);
}
function blockedEitherWay(a: Person, b: Person): boolean {
  return blocked(a.blocklist, b) || blocked(b.blocklist, a);
}

export function compatibility(a: Person, b: Person, entW?: Record<string, number>): number {
  if (blockedEitherWay(a, b)) return 0; // HARD GATE, bidirectional
  return gowerSimilarity(a, b, entW);
}

// Human-readable reasons for the reveal card.
export function matchReasons(a: Person, b: Person): MatchReason[] {
  const reasons: MatchReason[] = [];
  const shared = (a.interests || []).filter((x) => (b.interests || []).includes(x));
  if (shared.length) reasons.push({ kind: "interest", shared });
  if (a.year && b.year && a.year === b.year) reasons.push({ kind: "year", shared: [a.year] });
  const sharedQs = Q_IDS.filter((q) => a.answers?.[q] != null && a.answers[q] === b.answers?.[q])
    .sort((x, y) => (Q_PRIOR[y] ?? 1) - (Q_PRIOR[x] ?? 1))
    .slice(0, 3);
  if (sharedQs.length) {
    const labels = sharedQs.map((qid) => QUESTIONS.find((q) => q.id === qid)?.q || qid);
    reasons.push({ kind: "survey", shared: labels });
  }
  return reasons;
}

// Candidate-to-candidate resemblance for MMR (answer agreement + interest overlap).
function candidateSimilarity(a: Person, b: Person): number {
  let agree = 0;
  let n = 0;
  for (const q of Q_IDS) {
    if (a.answers?.[q] != null && b.answers?.[q] != null) {
      n++;
      if (a.answers[q] === b.answers[q]) agree++;
    }
  }
  const answerSim = n > 0 ? agree / n : 0;
  return 0.5 * answerSim + 0.5 * jaccard(a.interests, b.interests);
}

export interface RankOpts {
  temperature?: number; // 0 = Kindred/curated, 1 = Chaos/wild
  boosts?: Set<string> | string[]; // RA-nominated pairings
}

// ---- Weekly drop: the ranked slate the user picks from --------------------
export function rankedMatches(user: Person, pool: Person[], n = 6, opts: RankOpts = {}): RankedMatch[] {
  const temperature = opts.temperature ?? 0.45;
  const boosts = opts.boosts instanceof Set ? opts.boosts : new Set(opts.boosts || []);
  const isBoosted = (p: Person) => boosts.has(p.id);
  const people = [user, ...pool];
  const entW = entropyWeights(people);

  interface Scored {
    person: Person;
    raw: number;
    capped: number;
    z: number;
    key: number;
    rel: number;
    nudged?: boolean;
  }

  // 1. raw compatibility; drop gated candidates (raw 0) entirely.
  const scored: Scored[] = pool
    .filter((p) => p.id !== user.id)
    .map((p) => ({ person: p, raw: compatibility(user, p, entW) }))
    .filter((s) => s.raw > 0) as Scored[];

  if (!scored.length) return [];

  // 2. anti-clone saturation cap at the cohort's 90th percentile.
  const sortedRaw = scored.map((s) => s.raw).sort((x, y) => x - y);
  const cap = quantile(sortedRaw, SAT_PERCENTILE);
  scored.forEach((s) => (s.capped = Math.min(s.raw, cap)));

  // 3. z-score the capped scores.
  const vals = scored.map((s) => s.capped);
  const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1)) || 1;
  scored.forEach((s) => (s.z = (s.capped - mean) / sd));

  // 3b. nudge: fixed z-score boost to RA-nominated candidates.
  scored.forEach((s) => {
    if (isBoosted(s.person)) {
      s.z += NUDGE_BOOST;
      s.nudged = true;
    }
  });

  // 4. serendipity via Gumbel-top-k. Seeded per user + temperature.
  const T = T_FLOOR + temperature * (T_MAX - T_FLOOR);
  const rng = mulberry32(hashStr(user.id || "me") ^ Math.round(T * 1000));
  scored.forEach((s) => {
    const g = -Math.log(-Math.log(rng() || 1e-9));
    s.key = s.z / T + g;
  });
  const shortlist = [...scored]
    .sort((a, b) => b.key - a.key)
    .slice(0, Math.min(scored.length, Math.max(n + 5, 12)));

  const keys = shortlist.map((s) => s.key);
  const kMin = Math.min(...keys);
  const kMax = Math.max(...keys);
  const kSpan = kMax - kMin || 1;
  shortlist.forEach((s) => (s.rel = (s.key - kMin) / kSpan));

  // 5. MMR de-clone.
  const picked: Scored[] = [];
  const remaining = [...shortlist];
  while (picked.length < n && remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const red = picked.length
        ? Math.max(...picked.map((p) => candidateSimilarity(c.person, p.person)))
        : 0;
      const mmr = MMR_LAMBDA * c.rel - (1 - MMR_LAMBDA) * red;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }
    picked.push(remaining.splice(bestIdx, 1)[0]);
  }

  // 6. shape the UI expects.
  return picked.map((s) => ({
    person: s.person,
    score: s.raw,
    reasons: matchReasons(user, s.person),
    nudged: s.nudged,
  }));
}

// ---- Interest-group clusters (1:many, for "meet the whole crew") -----------
export function interestGroups(people: Person[], size = 5): { tag: string; members: Person[] }[] {
  const buckets: Record<string, Person[]> = {};
  for (const p of people) {
    for (const tag of p.interests || []) {
      (buckets[tag] ||= []).push(p);
    }
  }
  const groups: { tag: string; members: Person[] }[] = [];
  const used = new Set<string>();
  const sorted = Object.entries(buckets).sort((a, b) => b[1].length - a[1].length);
  for (const [tag, members] of sorted) {
    const fresh = members.filter((m) => !used.has(m.id));
    for (let i = 0; i < fresh.length; i += size) {
      const chunk = fresh.slice(i, i + size);
      if (chunk.length >= 3) {
        chunk.forEach((m) => used.add(m.id));
        groups.push({ tag, members: chunk });
      }
    }
  }
  return groups;
}
