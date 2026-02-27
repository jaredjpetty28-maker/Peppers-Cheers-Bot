import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  discordToken: string;
  discordClientId: string;
  openAiApiKey: string;
  databasePath: string;
  logLevel: string;
  healthPort: number;
  default420ChannelId?: string;
  openAiModel: string;
  openAiTtsModel: string;
  openAiTtsVoice: string;
  maxUploadMb: number;
  pepperDropMinutes: number;
  global420Enabled: boolean;
}

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

export const loadConfig = (): AppConfig => ({
  discordToken: required('DISCORD_TOKEN'),
  discordClientId: required('DISCORD_CLIENT_ID'),
  openAiApiKey: required('OPENAI_API_KEY'),
  databasePath: process.env.DATABASE_PATH ?? './data/king-pepper.db',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  healthPort: Number(process.env.HEALTH_PORT ?? 8080),
  default420ChannelId: process.env.DEFAULT_420_CHANNEL_ID,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  openAiTtsModel: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
  openAiTtsVoice: process.env.OPENAI_TTS_VOICE ?? 'alloy',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  pepperDropMinutes: Number(process.env.PEPPER_DROP_MINUTES ?? 45),
  global420Enabled: (process.env.GLOBAL_420_ENABLED ?? 'true').toLowerCase() === 'true'
});
