import "dotenv/config";
import { loadConfig } from "../src/utils/config";
import { createLogger } from "../src/utils/logger";
import { CommandRegistryService } from "../src/services/commandRegistryService";
import { commands } from "../src/commands";

async function run() {
  const config = loadConfig();
  const logger = createLogger(config);
  const registry = new CommandRegistryService(logger);

  await registry.registerCommands(commands, config.DISCORD_TOKEN, config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
