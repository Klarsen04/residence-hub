// A mock resident pool so the Floor Mixer works instantly with zero backend —
// mirroring Ctrl+Meet's single-player mock cohort ("the demo never breaks").
// Swap this for real /api/residents data once you want it multiplayer.

import type { Person } from "./matching";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const AVATARS = ["🦊", "🐨", "🐸", "🦉", "🐙", "🦄", "🐧", "🦋", "🐳", "🦩", "🐝", "🦕", "🐢", "🦔", "🐰", "🐼"];

const INTERESTS = [
  "gaming", "hiking", "baking", "anime", "gym", "music", "coffee", "photography",
  "cooking", "movies", "art", "reading", "sports", "coding", "dancing", "plants",
  "thrifting", "board games", "running", "k-pop", "cats", "dogs", "volunteering", "crafts",
];

const NAMES = [
  "Maya Chen", "Liam Torres", "Priya Patel", "Noah Kim", "Sofia Rossi", "Aiden Nguyen",
  "Zoe Williams", "Ethan Park", "Aria Johnson", "Lucas Martin", "Ivy Zhang", "Mason Lee",
  "Layla Ahmed", "Ryan Cooper", "Nora Silva", "Kai Anderson", "Emma Brooks", "Diego Reyes",
  "Hana Sato", "Owen Clark", "Leila Hassan", "Finn O'Brien", "Jade Thompson", "Arjun Mehta",
];

// Deterministic pseudo-random so the pool is stable between renders/reloads.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const QUESTION_IDS = ["night", "weekend", "food", "room", "hangout", "energy", "humor", "study", "adventure", "comfort"];
const OPTION_IDS = ["a", "b", "c", "d"];

export function buildMockPool(): Person[] {
  const rand = seeded(42);
  return NAMES.map((name, i) => {
    const answers: Record<string, string> = {};
    for (const qid of QUESTION_IDS) {
      answers[qid] = OPTION_IDS[Math.floor(rand() * OPTION_IDS.length)];
    }
    // 2-4 interests each
    const nInterests = 2 + Math.floor(rand() * 3);
    const interests: string[] = [];
    while (interests.length < nInterests) {
      const tag = INTERESTS[Math.floor(rand() * INTERESTS.length)];
      if (!interests.includes(tag)) interests.push(tag);
    }
    const floor = 1 + Math.floor(rand() * 4);
    const roomNum = 1 + Math.floor(rand() * 30);
    return {
      id: `res-${i}`,
      name,
      room: `${floor}${String(roomNum).padStart(2, "0")}`,
      year: YEARS[Math.floor(rand() * YEARS.length)],
      avatar: AVATARS[i % AVATARS.length],
      answers,
      interests,
    };
  });
}
