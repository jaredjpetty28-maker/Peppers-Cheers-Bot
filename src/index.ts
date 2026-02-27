import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import { loadConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import { attachProcessHandlers } from './utils/errorHandler.js';
import { DatabaseService } from './database/db.js';
import { AiService } from './ai/aiService.js';
import { AudioService } from './audio/audioService.js';
import { SettingsService } from './services/settingsService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { SchedulerService } from './scheduler/schedulerService.js';
import { registerInteractionHandler } from './events/interactionCreate.js';
import { registerReadyHandler } from './events/ready.js';
import { buildCommands } from './commands/index.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
attachProcessHandlers(logger);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const db = new DatabaseService(config.databasePath);
const ai = new AiService(config.openAiApiKey, config.openAiModel, config.openAiTtsModel, config.openAiTtsVoice);
const audio = new AudioService(db, ai);
const settings = new SettingsService(db);
const analytics = new AnalyticsService(db);
const scheduler = new SchedulerService(client, db, settings, config.pepperDropMinutes, config.global420Enabled);

const context = { config, logger, db, ai, audio, settings, analytics, scheduler };
const commands = buildCommands(context);

registerReadyHandler(client, context);
registerInteractionHandler(client, commands, context);

const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), guilds: client.guilds.cache.size, timestamp: new Date().toISOString() });
});

const server = app.listen(config.healthPort, () => {
  logger.info(`Health endpoint listening on port ${config.healthPort}`);
});

await client.login(config.discordToken);

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down King Pepper bot...');
  server.close();
  await client.destroy();
  process.exit(0);
};

process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
