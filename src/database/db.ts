import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { CheerClip, GuildSettings } from '../types/index.js';

export class DatabaseService {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        channel_420_id TEXT,
        audio_category TEXT NOT NULL DEFAULT 'default',
        voice_volume REAL NOT NULL DEFAULT 1.0,
        ai_mode TEXT NOT NULL DEFAULT 'party',
        cooldown_seconds INTEGER NOT NULL DEFAULT 120,
        global_420_enabled INTEGER NOT NULL DEFAULT 1,
        distortion_enabled INTEGER NOT NULL DEFAULT 0,
        pitch_semitones INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cheer_clips (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics (
        guild_id TEXT PRIMARY KEY,
        cheers_count INTEGER NOT NULL DEFAULT 0,
        last_cheer_at TEXT,
        pepper_drop_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS timezone_fires (
        timezone TEXT NOT NULL,
        day_key TEXT NOT NULL,
        PRIMARY KEY (timezone, day_key)
      );

      CREATE TABLE IF NOT EXISTS scheduled_cheers (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message TEXT NOT NULL,
        run_at TEXT NOT NULL
      );

    `);
  }

  getSettings(guildId: string): GuildSettings {
    const row = this.db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) as Record<string, unknown> | undefined;
    if (!row) {
      this.db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(guildId);
      return this.getSettings(guildId);
    }
    return {
      guildId,
      channel420Id: (row.channel_420_id as string | null) ?? null,
      audioCategory: row.audio_category as GuildSettings['audioCategory'],
      voiceVolume: row.voice_volume as number,
      aiMode: row.ai_mode as GuildSettings['aiMode'],
      cooldownSeconds: row.cooldown_seconds as number,
      global420Enabled: row.global_420_enabled as number,
      distortionEnabled: row.distortion_enabled as number,
      pitchSemitones: row.pitch_semitones as number
    };
  }

  updateSetting(guildId: string, key: string, value: string | number | null): void {
    const allowed = new Set(['channel_420_id', 'audio_category', 'voice_volume', 'ai_mode', 'cooldown_seconds', 'global_420_enabled', 'distortion_enabled', 'pitch_semitones']);
    if (!allowed.has(key)) {
      throw new Error(`Invalid setting key: ${key}`);
    }
    this.db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?) ON CONFLICT DO NOTHING').run(guildId);
    this.db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
  }

  addClip(clip: CheerClip): void {
    this.db.prepare('INSERT INTO cheer_clips (id, guild_id, category, name, path, weight, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(clip.id, clip.guildId, clip.category, clip.name, clip.path, clip.weight, clip.source, clip.createdAt);
  }

  listClips(guildId: string, category?: string): CheerClip[] {
    const rows = (category
      ? this.db.prepare('SELECT * FROM cheer_clips WHERE guild_id = ? AND category = ?').all(guildId, category)
      : this.db.prepare('SELECT * FROM cheer_clips WHERE guild_id = ?').all(guildId)) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      guildId: row.guild_id as string,
      category: row.category as CheerClip['category'],
      name: row.name as string,
      path: row.path as string,
      weight: row.weight as number,
      source: row.source as CheerClip['source'],
      createdAt: row.created_at as string
    }));
  }

  incrementCheers(guildId: string, isPepperDrop = false): void {
    this.db.prepare('INSERT INTO analytics (guild_id) VALUES (?) ON CONFLICT DO NOTHING').run(guildId);
    this.db.prepare('UPDATE analytics SET cheers_count = cheers_count + 1, last_cheer_at = ? WHERE guild_id = ?')
      .run(new Date().toISOString(), guildId);
    if (isPepperDrop) {
      this.db.prepare('UPDATE analytics SET pepper_drop_count = pepper_drop_count + 1 WHERE guild_id = ?').run(guildId);
    }
  }

  getAnalytics(guildId: string): { cheers: number; pepperDrops: number; lastCheerAt: string | null } {
    const row = this.db.prepare('SELECT * FROM analytics WHERE guild_id = ?').get(guildId) as Record<string, unknown> | undefined;
    return {
      cheers: (row?.cheers_count as number | undefined) ?? 0,
      pepperDrops: (row?.pepper_drop_count as number | undefined) ?? 0,
      lastCheerAt: (row?.last_cheer_at as string | undefined) ?? null
    };
  }

  hasTimezoneFired(timezone: string, dayKey: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM timezone_fires WHERE timezone = ? AND day_key = ?').get(timezone, dayKey);
    return Boolean(row);
  }



  addScheduledCheer(id: string, guildId: string, channelId: string, message: string, runAt: string): void {
    this.db.prepare('INSERT INTO scheduled_cheers (id, guild_id, channel_id, message, run_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, guildId, channelId, message, runAt);
  }

  dueScheduledCheers(nowIso: string): Array<{ id: string; guildId: string; channelId: string; message: string }> {
    const rows = this.db.prepare('SELECT * FROM scheduled_cheers WHERE run_at <= ?').all(nowIso) as Array<Record<string, unknown>>;
    this.db.prepare('DELETE FROM scheduled_cheers WHERE run_at <= ?').run(nowIso);
    return rows.map((row) => ({
      id: row.id as string,
      guildId: row.guild_id as string,
      channelId: row.channel_id as string,
      message: row.message as string
    }));
  }

  markTimezoneFired(timezone: string, dayKey: string): void {
    this.db.prepare('INSERT INTO timezone_fires (timezone, day_key) VALUES (?, ?) ON CONFLICT DO NOTHING').run(timezone, dayKey);
  }
}
