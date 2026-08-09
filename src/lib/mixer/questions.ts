// The Floor Mixer "vibe check" — a short, playful survey that drives resident
// matching. Cloned in spirit from Ctrl+Meet's 16-question survey, re-themed for
// dorm life. Each question is nominal (pick one option); the matching engine
// scores same-answer = 1, weighted by a research prior × entropy weight.
//
// Nothing here is personal/sensitive — it's all lighthearted so residents
// actually fill it out.

export interface SurveyOption {
  id: string;
  text: string;
}

export interface SurveyQuestion {
  id: string;
  q: string;
  options: SurveyOption[];
}

export const QUESTIONS: SurveyQuestion[] = [
  {
    id: "night",
    q: "It's 2am on a weeknight. Where are you?",
    options: [
      { id: "a", text: "Asleep. Obviously. We are not animals." },
      { id: "b", text: "Grinding an assignment due at 9am 🫠" },
      { id: "c", text: "Deep in a group chat about nothing" },
      { id: "d", text: "Making questionable microwave food" },
    ],
  },
  {
    id: "weekend",
    q: "Perfect Saturday on campus?",
    options: [
      { id: "a", text: "Big group hangout, the more the merrier" },
      { id: "b", text: "One or two close friends, low key" },
      { id: "c", text: "Recharging solo, thanks" },
      { id: "d", text: "Off campus adventure / day trip" },
    ],
  },
  {
    id: "food",
    q: "The dining hall is out of your go-to. You:",
    options: [
      { id: "a", text: "Adapt instantly, no big deal" },
      { id: "b", text: "Quietly mourn but cope" },
      { id: "c", text: "Order in and start a group order" },
      { id: "d", text: "This is a personal attack" },
    ],
  },
  {
    id: "room",
    q: "Your dorm room aesthetic is:",
    options: [
      { id: "a", text: "Cozy chaos — controlled clutter" },
      { id: "b", text: "Minimalist, everything has a home" },
      { id: "c", text: "Fairy lights + posters maximalism ✨" },
      { id: "d", text: "I genuinely just sleep here" },
    ],
  },
  {
    id: "hangout",
    q: "Best way to actually make a new friend?",
    options: [
      { id: "a", text: "Study session that becomes a hangout" },
      { id: "b", text: "Grabbing food / coffee" },
      { id: "c", text: "Late-night hallway conversation" },
      { id: "d", text: "Doing a random activity together" },
    ],
  },
  {
    id: "energy",
    q: "At a floor event, you're the one who:",
    options: [
      { id: "a", text: "Organized the whole thing" },
      { id: "b", text: "Shows up and vibes" },
      { id: "c", text: "Talks to literally everyone" },
      { id: "d", text: "Found the one quiet corner" },
    ],
  },
  {
    id: "humor",
    q: "Your sense of humor is best described as:",
    options: [
      { id: "a", text: "Chronically online meme energy" },
      { id: "b", text: "Dry / sarcastic" },
      { id: "c", text: "Wholesome and silly" },
      { id: "d", text: "Unhinged, in a fun way" },
    ],
  },
  {
    id: "study",
    q: "Ideal study environment?",
    options: [
      { id: "a", text: "Library, dead silent" },
      { id: "b", text: "Café with background noise" },
      { id: "c", text: "My room with music blasting" },
      { id: "d", text: "With friends, mostly \"studying\"" },
    ],
  },
  {
    id: "adventure",
    q: "Someone says \"let's go do something right now.\" You:",
    options: [
      { id: "a", text: "Already have my shoes on" },
      { id: "b", text: "Sure, if I know where we're going" },
      { id: "c", text: "Need a 20-minute warning minimum" },
      { id: "d", text: "It's past 9pm, absolutely not" },
    ],
  },
  {
    id: "comfort",
    q: "Comfort activity after a rough day?",
    options: [
      { id: "a", text: "Comfort show + snacks" },
      { id: "b", text: "Call someone / vent to a friend" },
      { id: "c", text: "Walk / gym / move my body" },
      { id: "d", text: "Nap and pretend today didn't happen" },
    ],
  },
];
