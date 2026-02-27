import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export type AudioCategory = 'default' | 'crazy' | 'king_pepper' | '420_special';
export type AiMode = 'roast' | 'motivational' | 'party' | 'stoner_philosopher';

export interface GuildSettings {
  guildId: string;
  channel420Id: string | null;
  audioCategory: AudioCategory;
  voiceVolume: number;
  aiMode: AiMode;
  cooldownSeconds: number;
  global420Enabled: number;
  distortionEnabled: number;
  pitchSemitones: number;
}

export interface CheerClip {
  id: string;
  guildId: string;
  category: AudioCategory;
  name: string;
  path: string;
  weight: number;
  source: 'upload' | 'builtin' | 'tts';
  createdAt: string;
}

export interface BotCommand {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface AppServices {
  config: import('../utils/config.js').AppConfig;
  logger: import('pino').Logger;
  db: import('../database/db.js').DatabaseService;
  ai: import('../ai/aiService.js').AiService;
  audio: import('../audio/audioService.js').AudioService;
  scheduler: import('../scheduler/schedulerService.js').SchedulerService;
  analytics: import('../services/analyticsService.js').AnalyticsService;
  settings: import('../services/settingsService.js').SettingsService;
}
