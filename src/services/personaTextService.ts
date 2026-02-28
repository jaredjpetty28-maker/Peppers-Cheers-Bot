import { AiMode } from "../database/db";

type CommandKind = "cheers" | "king-declare" | "pepper-wisdom";

interface PersonaInput {
  mode: AiMode;
  guildName: string;
  userName: string;
  command: CommandKind;
  topic?: string;
}

const modeLines: Record<AiMode, string[]> = {
  roast: [
    "You call that energy? Even mild peppers have more spark.",
    "Your vibe is under-seasoned, but salvageable.",
    "The crown has seen stronger starts from decaf monks."
  ],
  motivational: [
    "Stand tall, breathe fire, and execute with purpose.",
    "Discipline first. Flame second. Glory always.",
    "You are one decision away from a hotter legacy."
  ],
  party: [
    "The bass is up, the lights are wild, the realm is alive.",
    "Tonight we celebrate like the sky owes us thunder.",
    "Crowns up. Lighters up. Full send."
  ],
  stoner_philosopher: [
    "Time is smoke, drifting until intention gives it shape.",
    "A quiet ember can outlast a loud wildfire.",
    "The universe whispers louder when you stop shouting."
  ]
};

const commandOpeners: Record<CommandKind, string[]> = {
  cheers: ["Hear me, {user}.", "{user}, by royal decree.", "Attention {user}."],
  "king-declare": ["By the pepper throne:", "The crown declares:", "By fire and spice:"],
  "pepper-wisdom": ["Ancient pepper wisdom:", "The ember speaks:", "From the smoky archives:"]
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class PersonaTextService {
  generateMessage(input: PersonaInput): string {
    const opener = pick(commandOpeners[input.command]).replace("{user}", input.userName);
    const modeCore = pick(modeLines[input.mode]);
    const topicLine = input.topic ? ` Topic accepted: ${input.topic}.` : "";
    return `${opener} In ${input.guildName}, King Pepper says: ${modeCore}${topicLine}`;
  }
}
