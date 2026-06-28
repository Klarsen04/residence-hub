# Residence Hub — Page Wireframes

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌─────────┐                                                     │
│  │ SIDEBAR │  ┌────────────────────────────────────────────────┐ │
│  │         │  │                                                │ │
│  │ Logo    │  │              MAIN CONTENT                      │ │
│  │         │  │                                                │ │
│  │ ─────── │  │                                                │ │
│  │ Dashboard│  │                                                │ │
│  │ Events  │  │                                                │ │
│  │ Inspire │  │                                                │ │
│  │ Decor   │  │                                                │ │
│  │ Budgets │  │                                                │ │
│  │ Vendors │  │                                                │ │
│  │ Resources│ │                                                │ │
│  │ AI Plan │  │                                                │ │
│  │ Collab  │  │                                                │ │
│  │ Analytics│ │                                                │ │
│  │ ─────── │  │                                                │ │
│  │ Settings│  │                                                │ │
│  │ Avatar  │  └────────────────────────────────────────────────┘ │
│  └─────────┘                                                     │
└──────────────────────────────────────────────────────────────────┘
```

## Dashboard

```
┌──────────────────────────────────────────────────────┐
│  Welcome back, [Name]!            [Hall Badge]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  UPCOMING EVENTS    │  │  BUDGET SNAPSHOT     │   │
│  │                     │  │                      │   │
│  │  Today              │  │  ┌────────────┐      │   │
│  │  • Movie Night 7pm  │  │  │  Donut     │      │   │
│  │  • Study Break 9pm  │  │  │  Chart     │      │   │
│  │                     │  │  └────────────┘      │   │
│  │  This Week          │  │  $800 / $1200        │   │
│  │  • Floor Meeting    │  │  $400 remaining      │   │
│  │  • Wellness Wed     │  │                      │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  INSPIRATION FEED   │  │  RESOURCE FEED       │   │
│  │                     │  │                      │   │
│  │  ┌───┐ ┌───┐ ┌───┐ │  │  • Bulletin Board    │   │
│  │  │img│ │img│ │img│ │  │    Template (new)     │   │
│  │  └───┘ └───┘ └───┘ │  │  • Welcome Week      │   │
│  │                     │  │    Checklist          │   │
│  │  ┌───┐ ┌───┐ ┌───┐ │  │  • RA Training       │   │
│  │  │img│ │img│ │img│ │  │    Slides             │   │
│  │  └───┘ └───┘ └───┘ │  │                      │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Events Page

```
┌──────────────────────────────────────────────────────┐
│  Events                          [+ New Event]       │
├──────────────────────────────────────────────────────┤
│  [Day] [Week] [Month] [List]    [Filter ▾] [Search] │
│                                                      │
│  ┌──────────────── CALENDAR VIEW ──────────────────┐ │
│  │  < June 2026 >                                  │ │
│  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun              │ │
│  │  ┌────┬────┬────┬────┬────┬────┬────┐           │ │
│  │  │    │    │  1 │  2 │  3 │  4 │  5 │           │ │
│  │  │    │    │ •  │    │ •• │    │    │           │ │
│  │  ├────┼────┼────┼────┼────┼────┼────┤           │ │
│  │  │  6 │  7 │  8 │  9 │ 10 │ 11 │ 12 │           │ │
│  │  │    │ •  │    │ •  │    │    │    │           │ │
│  │  └────┴────┴────┴────┴────┴────┴────┘           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  Upcoming                                            │
│  ┌──────────────────────────────────────────┐        │
│  │ 🎉 Movie Night         Jun 3 @ 7:00 PM  │        │
│  │    Morrison Hall • Community Building     │        │
│  │    [Approved] [Budget: $75]               │        │
│  ├──────────────────────────────────────────┤        │
│  │ 📚 Study Break         Jun 5 @ 9:00 PM  │        │
│  │    Morrison Hall • Academic Success       │        │
│  │    [Pending]                              │        │
│  └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

## Inspiration Page (Pinterest-style grid)

```
┌──────────────────────────────────────────────────────┐
│  Inspiration                [+ Save] [Collections]   │
├──────────────────────────────────────────────────────┤
│  [All] [Welcome] [Wellness] [Study] [Finals] [More▾]│
│                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │        │ │        │ │        │ │        │       │
│  │  img   │ │  img   │ │        │ │  img   │       │
│  │        │ │        │ │  img   │ │        │       │
│  │        │ │        │ │        │ │        │       │
│  ├────────┤ ├────────┤ │        │ ├────────┤       │
│  │Door Dec│ │Pin idea│ │        │ │TikTok  │       │
│  │♥ 12    │ │♥ 8     │ ├────────┤ │♥ 24    │       │
│  └────────┘ └────────┘ │Bulletin│ └────────┘       │
│  ┌────────┐ ┌────────┐ │♥ 15    │ ┌────────┐       │
│  │        │ │        │ └────────┘ │        │       │
│  │  img   │ │  img   │            │  img   │       │
│  │        │ │        │ ┌────────┐ │        │       │
│  ├────────┤ ├────────┤ │        │ ├────────┤       │
│  │IG post │ │YouTube │ │  img   │ │Upload  │       │
│  │♥ 5     │ │♥ 3     │ │        │ │♥ 7     │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
└──────────────────────────────────────────────────────┘
```

## AI Event Planner

```
┌──────────────────────────────────────────────────────┐
│  AI Event Planner                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  Budget         [$___________]               │     │
│  │  Audience       [First-Year Residents    ▾]  │     │
│  │  Goal           [Community Building      ▾]  │     │
│  │  Attendance     [___]                        │     │
│  │                                              │     │
│  │  [✨ Generate Event Ideas]                   │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  💡 Event Concept: Pajama Movie Marathon     │     │
│  │                                              │     │
│  │  Description: Transform your floor lounge... │     │
│  │                                              │     │
│  │  📋 Shopping List                            │     │
│  │  • Popcorn bags (40) — $15                   │     │
│  │  • Hot cocoa packets — $12                   │     │
│  │  • Blankets (10) — $40                       │     │
│  │  • Projector rental — $0 (hall equipment)    │     │
│  │  Total: $67                                  │     │
│  │                                              │     │
│  │  ⏰ Timeline                                 │     │
│  │  6:00 PM — Setup lounge                      │     │
│  │  6:30 PM — Movie 1 starts                    │     │
│  │  ...                                         │     │
│  │                                              │     │
│  │  [Create Event from This] [Save] [Regenerate]│     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

## Budget Page

```
┌──────────────────────────────────────────────────────┐
│  Budgets                      [+ New Request]        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Hall Budget: Morrison Hall — Fall 2026              │
│  ┌──────────────────────────────────────────┐        │
│  │  Allocated: $3,000                        │        │
│  │  ████████████████░░░░░░░  Used: $1,850    │        │
│  │  Remaining: $1,150                        │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  My Requests                                         │
│  ┌──────────────────────────────────────────┐        │
│  │  Movie Night         $75    [Approved ✓]  │        │
│  │  Study Break         $50    [Pending ○]   │        │
│  │  Welcome BBQ         $200   [Draft ...]   │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Spending History                                    │
│  ┌──────────────────────────────────────────┐        │
│  │  [Bar chart — monthly spending]           │        │
│  └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

## Decoration Hub

```
┌──────────────────────────────────────────────────────┐
│  Decoration Hub              [+ Add Decoration]      │
├──────────────────────────────────────────────────────┤
│  [Door Decs] [Bulletin Boards] [Hallway]            │
│  [Welcome] [Finals] [Mental Health] [Holidays] [▾]  │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │          │ │          │ │          │            │
│  │   img    │ │   img    │ │   img    │            │
│  │          │ │          │ │          │            │
│  ├──────────┤ ├──────────┤ ├──────────┤            │
│  │Fall Door │ │Growth    │ │Wellness  │            │
│  │Decs      │ │Mindset   │ │Board     │            │
│  │~$5/door  │ │Board     │ │Free print│            │
│  └──────────┘ │~$12      │ └──────────┘            │
│               └──────────┘                          │
└──────────────────────────────────────────────────────┘
```

## Design Language

- **Colors**: Warm + modern (think Notion meets Pinterest)
  - Primary: Deep purple (#6366f1) or warm coral
  - Accent: Amber/gold for highlights
  - Neutral: Slate grays
  - Success/Error: Standard green/red
- **Typography**: Inter or system font
- **Cards**: Rounded corners (lg), subtle shadows
- **Grid**: Masonry for inspiration, standard grid elsewhere
- **Icons**: Lucide React (consistent with shadcn/ui)
- **Dark mode**: Supported via next-themes
