// Achievement badges for Residence Life Wrapped. Each badge unlocks when the
// RA's season stats clear a threshold. Pure client-side derivation from the
// /api/wrapped stats payload.

export interface WrappedStats {
  events: number;
  totalAttendance: number;
  residents: number;
  checkIns: number;
  roomChecks: number;
  incidents: number;
  polls: number;
  notes: number;
  dutyShifts: number;
  decorationsMade: number;
  inspirations: number;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  earned: boolean;
  tier: "bronze" | "silver" | "gold";
}

export function computeBadges(s: WrappedStats): Badge[] {
  const raw: (Omit<Badge, "earned"> & { when: (s: WrappedStats) => boolean })[] = [
    {
      id: "host",
      emoji: "🎉",
      title: "Party Starter",
      desc: "Organized 5+ events",
      tier: "bronze",
      when: (s) => s.events >= 5,
    },
    {
      id: "host-gold",
      emoji: "🎪",
      title: "Event Legend",
      desc: "Organized 15+ events",
      tier: "gold",
      when: (s) => s.events >= 15,
    },
    {
      id: "crowd",
      emoji: "🙌",
      title: "Crowd Pleaser",
      desc: "100+ total attendance",
      tier: "silver",
      when: (s) => s.totalAttendance >= 100,
    },
    {
      id: "connector",
      emoji: "🤝",
      title: "The Connector",
      desc: "25+ resident check-ins",
      tier: "silver",
      when: (s) => s.checkIns >= 25,
    },
    {
      id: "guardian",
      emoji: "🛡️",
      title: "Floor Guardian",
      desc: "Completed 10+ room check rounds",
      tier: "bronze",
      when: (s) => s.roomChecks >= 10,
    },
    {
      id: "night-owl",
      emoji: "🌙",
      title: "Night Owl",
      desc: "Covered 10+ duty shifts",
      tier: "bronze",
      when: (s) => s.dutyShifts >= 10,
    },
    {
      id: "decorator",
      emoji: "🎨",
      title: "Master Decorator",
      desc: "Made 5+ decorations",
      tier: "silver",
      when: (s) => s.decorationsMade >= 5,
    },
    {
      id: "voice",
      emoji: "📊",
      title: "Voice of the Floor",
      desc: "Ran 5+ polls",
      tier: "bronze",
      when: (s) => s.polls >= 5,
    },
    {
      id: "muse",
      emoji: "💡",
      title: "Idea Machine",
      desc: "Saved 10+ inspirations",
      tier: "bronze",
      when: (s) => s.inspirations >= 10,
    },
    {
      id: "full-house",
      emoji: "🏠",
      title: "Full House",
      desc: "Managing 20+ residents",
      tier: "gold",
      when: (s) => s.residents >= 20,
    },
    {
      id: "steady",
      emoji: "🧯",
      title: "Steady Hand",
      desc: "Logged & handled 3+ incidents",
      tier: "silver",
      when: (s) => s.incidents >= 3,
    },
    {
      id: "scribe",
      emoji: "📝",
      title: "The Scribe",
      desc: "Kept 15+ notes",
      tier: "bronze",
      when: (s) => s.notes >= 15,
    },
  ];

  return raw.map(({ when, ...b }) => ({ ...b, earned: when(s) }));
}
