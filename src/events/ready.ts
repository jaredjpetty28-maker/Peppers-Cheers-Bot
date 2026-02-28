import { ActivityType, Events } from "discord.js";
import { ServiceContainer } from "../services/serviceContainer";

export function registerReadyEvent(services: ServiceContainer) {
  services.client.once(Events.ClientReady, (client) => {
    const rotationTexts = [
      "Pepper & Tech did that mafuka!",
      "Smoke or get da Bubble Guts!",
      "Cant Handle the heat get out the hotbox!"
    ];

    let idx = 0;
    const applyPresence = () => {
      const text = rotationTexts[idx % rotationTexts.length];
      client.user.setPresence({
        activities: [{ name: text, type: ActivityType.Playing }],
        status: "online"
      });
      idx += 1;
    };

    applyPresence();
    setInterval(applyPresence, 5 * 60 * 1000).unref();

    services.logger.info({ user: client.user.tag }, "King Pepper bot online");
  });
}
