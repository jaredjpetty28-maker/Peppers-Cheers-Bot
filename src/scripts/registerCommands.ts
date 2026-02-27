import { REST, Routes } from 'discord.js';
import { loadConfig } from '../utils/config.js';
import { buildCommands } from '../commands/index.js';
import { createLogger } from '../utils/logger.js';
import { DatabaseService } from '../database/db.js';
import { AiService } from '../ai/aiService.js';
import { AudioService } from '../audio/audioService.js';
import { SettingsService } from '../services/settingsService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { SchedulerService } from '../scheduler/schedulerService.js';
import { Client, GatewayIntentBits } from 'discord.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const db = new DatabaseService(config.databasePath);
const ai = new AiService(config.openAiApiKey, config.openAiModel, config.openAiTtsModel, config.openAiTtsVoice);
const settings = new SettingsService(db);
const analytics = new AnalyticsService(db);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const scheduler = new SchedulerService(client, db, settings, config.pepperDropMinutes, config.global420Enabled);
const audio = new AudioService(db, ai);
const ctx = { config, logger, db, ai, settings, analytics, scheduler, audio };

const commands = [...buildCommands(ctx).values()].map((c) => c.data.toJSON());

const rest = new REST({ version: '10' }).setToken(config.discordToken);

await rest.put(Routes.applicationCommands(config.discordClientId), { body: commands });
logger.info(`Registered ${commands.length} slash commands.`);
