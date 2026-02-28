import { Binary, Collection, WithId } from "mongodb";
import { MongoConnection, AudioCategory, AiMode, GuildSettings, AudioClip, ScheduledCheer } from "./db";

const DEFAULTS: Omit<GuildSettings, "guildId"> = {
  channel420Id: null,
  voice420ChannelId: null,
  audioCategory: "default",
  voiceVolume: 0.8,
  aiMode: "party",
  enableGlobal420: 1,
  cooldownSeconds: 300,
  distortionEnabled: 0,
  reverbEnabled: 1,
  pitchShift: 1
};

interface GuildSettingsDoc extends GuildSettings {
  updatedAt: string;
}

interface AudioClipDoc {
  guildId: string | null;
  category: AudioCategory;
  filePath: string;
  weight: number;
  isPrebuilt: number;
  createdBy: string | null;
  createdAt: string;
  backupContentType?: string;
  backupData?: Buffer;
  backupUpdatedAt?: string;
}

interface TriggerDoc {
  timezone: string;
  triggerDate: string;
  triggeredAt: string;
}

interface ScheduledCheerDoc {
  guildId: string;
  channelId: string;
  timezone: string;
  hhmm: string;
  message: string;
  enabled: number;
  createdAt: string;
}

interface AnalyticsDoc {
  guildId: string;
  metric: string;
  count: number;
}

function clipFromDoc(doc: WithId<AudioClipDoc>): AudioClip {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    category: doc.category,
    filePath: doc.filePath,
    weight: doc.weight,
    isPrebuilt: doc.isPrebuilt,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt
  };
}

function scheduledFromDoc(doc: WithId<ScheduledCheerDoc>): ScheduledCheer {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    channelId: doc.channelId,
    timezone: doc.timezone,
    hhmm: doc.hhmm,
    message: doc.message,
    enabled: doc.enabled
  };
}

export class SettingsRepository {
  private readonly collection: Collection<GuildSettingsDoc>;

  constructor(db: MongoConnection) {
    this.collection = db.db.collection<GuildSettingsDoc>("guild_settings");
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
  }

  async getGuildSettings(guildId: string): Promise<GuildSettings> {
    await this.collection.updateOne(
      { guildId },
      { $setOnInsert: { guildId, ...DEFAULTS, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    const row = await this.collection.findOne({ guildId });
    if (!row) {
      return { guildId, ...DEFAULTS };
    }
    const { updatedAt: _updatedAt, ...settings } = row;
    return settings;
  }

  async updateGuildSettings(guildId: string, updates: Partial<Omit<GuildSettings, "guildId">>): Promise<GuildSettings> {
    const existing = await this.getGuildSettings(guildId);
    const merged: GuildSettings = { ...existing, ...updates };
    await this.collection.updateOne(
      { guildId },
      { $set: { ...merged, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return merged;
  }
}

export class AudioRepository {
  private readonly collection: Collection<AudioClipDoc>;

  constructor(db: MongoConnection) {
    this.collection = db.db.collection<AudioClipDoc>("audio_clips");
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ category: 1, guildId: 1 });
    await this.collection.createIndex({ filePath: 1 }, { unique: true });
  }

  async addClip(payload: {
    guildId: string | null;
    category: AudioCategory;
    filePath: string;
    weight: number;
    isPrebuilt: number;
    createdBy: string | null;
    backupContentType?: string;
    backupData?: Buffer;
  }): Promise<void> {
    await this.collection.insertOne({
      ...payload,
      backupUpdatedAt: payload.backupData ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });
  }

  async listClipsForGuild(guildId: string, category: AudioCategory): Promise<AudioClip[]> {
    const rows = await this.collection
      .find({
        category,
        $or: [{ guildId }, { guildId: null }]
      })
      .toArray();
    return rows.map(clipFromDoc);
  }

  async findByPath(filePath: string): Promise<AudioClip | undefined> {
    const row = await this.collection.findOne({ filePath });
    return row ? clipFromDoc(row as WithId<AudioClipDoc>) : undefined;
  }

  async setClipBackup(filePath: string, backupData: Buffer, backupContentType = "audio/mpeg"): Promise<void> {
    await this.collection.updateOne(
      { filePath },
      {
        $set: {
          backupData,
          backupContentType,
          backupUpdatedAt: new Date().toISOString()
        }
      }
    );
  }

  async getClipBackup(filePath: string): Promise<Buffer | undefined> {
    const row = await this.collection.findOne(
      { filePath },
      {
        projection: { backupData: 1 }
      }
    );
    const value = (row as { backupData?: unknown } | null)?.backupData;
    if (!value) {
      return undefined;
    }
    if (Buffer.isBuffer(value)) {
      return value;
    }
    if (value instanceof Binary) {
      return Buffer.from(value.buffer);
    }
    return undefined;
  }
}

export class TriggerRepository {
  private readonly collection: Collection<TriggerDoc>;

  constructor(db: MongoConnection) {
    this.collection = db.db.collection<TriggerDoc>("timezone_triggers");
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ timezone: 1, triggerDate: 1 }, { unique: true });
  }

  async wasTriggered(timezone: string, triggerDate: string): Promise<boolean> {
    const row = await this.collection.findOne({ timezone, triggerDate });
    return Boolean(row);
  }

  async markTriggered(timezone: string, triggerDate: string): Promise<void> {
    await this.collection.updateOne(
      { timezone, triggerDate },
      { $setOnInsert: { timezone, triggerDate, triggeredAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
}

export class ScheduledCheerRepository {
  private readonly collection: Collection<ScheduledCheerDoc>;

  constructor(db: MongoConnection) {
    this.collection = db.db.collection<ScheduledCheerDoc>("scheduled_cheers");
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, enabled: 1, timezone: 1, hhmm: 1 });
  }

  async add(input: Omit<ScheduledCheer, "id" | "enabled"> & { enabled?: number }): Promise<void> {
    await this.collection.insertOne({
      guildId: input.guildId,
      channelId: input.channelId,
      timezone: input.timezone,
      hhmm: input.hhmm,
      message: input.message,
      enabled: input.enabled ?? 1,
      createdAt: new Date().toISOString()
    });
  }

  async listEnabled(): Promise<ScheduledCheer[]> {
    const rows = await this.collection.find({ enabled: 1 }).toArray();
    return rows.map(scheduledFromDoc);
  }
}

export class AnalyticsRepository {
  private readonly collection: Collection<AnalyticsDoc>;

  constructor(db: MongoConnection) {
    this.collection = db.db.collection<AnalyticsDoc>("analytics");
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, metric: 1 }, { unique: true });
  }

  async increment(guildId: string, metric: string, delta = 1): Promise<void> {
    await this.collection.updateOne({ guildId, metric }, { $inc: { count: delta } }, { upsert: true });
  }

  async getGuildMetrics(guildId: string): Promise<Array<{ metric: string; count: number }>> {
    const rows = await this.collection.find({ guildId }).sort({ metric: 1 }).toArray();
    return rows.map((r) => ({ metric: r.metric, count: r.count }));
  }
}
