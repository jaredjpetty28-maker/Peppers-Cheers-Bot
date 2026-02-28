import { REST, Routes } from "discord.js";
import { SlashCommand } from "../commands/types";
import { Logger } from "../utils/logger";

export class CommandRegistryService {
  constructor(private readonly logger: Logger) {}

  async registerCommands(
    commands: SlashCommand[],
    token: string,
    clientId: string,
    guildId?: string
  ): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(token);
    const payload = commands.map((cmd) => cmd.data.toJSON());

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload });
      this.logger.info({ guildId, count: payload.length }, "Registered guild slash commands");
      return;
    }

    await rest.put(Routes.applicationCommands(clientId), { body: payload });
    this.logger.info({ count: payload.length }, "Registered global slash commands");
  }
}
