import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  HEALTH_PORT: z.coerce.number().int().positive().default(3000),
  DASHBOARD_API_KEY: z.string().optional(),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
  DEFAULT_AUDIO_VOLUME: z.coerce.number().min(0).max(2).default(0.8),
  FFMPEG_PATH: z.string().optional(),
  ENABLE_GLOBAL_420: z.coerce.boolean().default(true),
  ENABLE_PEPPER_DROPS: z.coerce.boolean().default(true),
  PEPPER_DROP_MINUTES: z.coerce.number().int().positive().default(15),
  PEPPER_DROP_CHANCE: z.coerce.number().min(0).max(1).default(0.12)
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issueList = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issueList}`);
  }
  return parsed.data;
}
