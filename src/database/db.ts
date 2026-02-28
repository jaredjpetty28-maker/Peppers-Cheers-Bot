import { Db, MongoClient } from "mongodb";
import { AppConfig } from "../utils/config";

export type AudioCategory = "default" | "crazy" | "king_pepper" | "420_special";
export type AiMode = "roast" | "motivational" | "party" | "stoner_philosopher";

export interface GuildSettings {
  guildId: string;
  channel420Id: string | null;
  voice420ChannelId: string | null;
  audioCategory: AudioCategory;
  voiceVolume: number;
  aiMode: AiMode;
  enableGlobal420: number;
  cooldownSeconds: number;
  distortionEnabled: number;
  reverbEnabled: number;
  pitchShift: number;
}

export interface AudioClip {
  id: string;
  guildId: string | null;
  category: AudioCategory;
  filePath: string;
  weight: number;
  isPrebuilt: number;
  createdBy: string | null;
  createdAt: string;
}

export interface ScheduledCheer {
  id: string;
  guildId: string;
  channelId: string;
  timezone: string;
  hhmm: string;
  message: string;
  enabled: number;
}

export class MongoConnection {
  private readonly client: MongoClient;
  private dbInstance: Db | null = null;

  constructor(private readonly config: AppConfig) {
    this.client = new MongoClient(config.MONGODB_URI);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.dbInstance = this.client.db(this.config.MONGODB_DB_NAME);
  }

  get db(): Db {
    if (!this.dbInstance) {
      throw new Error("MongoDB connection has not been initialized. Call connect() first.");
    }
    return this.dbInstance;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
