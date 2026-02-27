import { DatabaseService } from '../database/db.js';
import { AiMode, AudioCategory, GuildSettings } from '../types/index.js';

export class SettingsService {
  constructor(private readonly db: DatabaseService) {}

  get(guildId: string): GuildSettings {
    return this.db.getSettings(guildId);
  }

  set420Channel(guildId: string, channelId: string): void {
    this.db.updateSetting(guildId, 'channel_420_id', channelId);
  }

  setVoiceMode(guildId: string, mode: AiMode): void {
    this.db.updateSetting(guildId, 'ai_mode', mode);
  }

  setAudioCategory(guildId: string, category: AudioCategory): void {
    this.db.updateSetting(guildId, 'audio_category', category);
  }

  setDistortion(guildId: string, enabled: boolean): void {
    this.db.updateSetting(guildId, 'distortion_enabled', enabled ? 1 : 0);
  }

  setPitch(guildId: string, semitones: number): void {
    this.db.updateSetting(guildId, 'pitch_semitones', semitones);
  }
}
