export interface PrebuiltClip {
  name: string;
  category: "default" | "crazy" | "king_pepper" | "420_special";
  text: string;
}

export const prebuiltClips: PrebuiltClip[] = [
  {
    name: "king-pepper-declares-you-to-smoke.mp3",
    category: "king_pepper",
    text: "King Pepper declares you to smoke with honor and precision."
  },
  {
    name: "the-pepper-has-spoken.mp3",
    category: "king_pepper",
    text: "The Pepper has spoken. The realm obeys the flame."
  },
  {
    name: "blaze-it-champions.mp3",
    category: "crazy",
    text: "Blaze it, champions. Spice levels rising to maximum."
  },
  {
    name: "spice-level-420-engaged.mp3",
    category: "420_special",
    text: "Spice level 420 engaged. Hold formation and ignite."
  },
  {
    name: "the-realm-smokes-at-once.mp3",
    category: "default",
    text: "The realm smokes at once. King Pepper approves this unity."
  }
];
