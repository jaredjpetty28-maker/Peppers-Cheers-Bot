import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "node:path";
import { loadConfig } from "./utils/config";
import { createLogger } from "./utils/logger";
import { MongoConnection } from "./database/db";
import { ServiceContainer } from "./services/serviceContainer";
import { registerReadyEvent } from "./events/ready";
import { registerInteractionEvent } from "./events/interactionCreate";
import { Global420Scheduler, PepperDropScheduler, ScheduledCheersScheduler } from "./scheduler/schedulers";
import { HealthService } from "./services/healthService";
import { ensurePrebuiltClips } from "./audio/seedPrebuilt";

function bootstrapFfmpeg(configPath?: string) {
  const ffmpegPath = configPath || ffmpegInstaller.path;
  process.env.FFMPEG_PATH = ffmpegPath;

  const ffmpegDir = path.dirname(ffmpegPath);
  const currentPath = process.env.PATH ?? "";
  if (!currentPath.split(path.delimiter).includes(ffmpegDir)) {
    process.env.PATH = `${ffmpegDir}${path.delimiter}${currentPath}`;
  }
}

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  bootstrapFfmpeg(config.FFMPEG_PATH);

  const db = new MongoConnection(config);
  await db.connect();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Channel]
  });

  const services = new ServiceContainer(config, logger, client, db);
  await services.init();

  registerReadyEvent(services);
  registerInteractionEvent(services);

  const healthService = new HealthService(logger, config.HEALTH_PORT, services.analyticsRepo, config.DASHBOARD_API_KEY);
  healthService.start();

  await ensurePrebuiltClips(services);

  if (config.ENABLE_GLOBAL_420) {
    new Global420Scheduler(services).start();
  }
  if (config.ENABLE_PEPPER_DROPS) {
    new PepperDropScheduler(services).start();
  }
  new ScheduledCheersScheduler(services).start();

  await client.login(config.DISCORD_TOKEN);

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down gracefully");
    await client.destroy();
    await db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
