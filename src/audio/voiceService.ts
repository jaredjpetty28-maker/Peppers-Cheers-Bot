import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel
} from "@discordjs/voice";
import { GuildMember, VoiceBasedChannel } from "discord.js";
import path from "node:path";
import fs from "node:fs";
import { SettingsRepository, AudioRepository, AnalyticsRepository } from "../database/repositories";
import { AudioCategory } from "../database/db";
import { Logger } from "../utils/logger";
import { AppError } from "../utils/errors";

interface QueueItem {
  guildId: string;
  channel: VoiceBasedChannel;
  category: AudioCategory;
}

export class VoiceService {
  private readonly players = new Map<string, AudioPlayer>();
  private readonly inFlight = new Set<string>();
  private readonly categories: AudioCategory[] = ["default", "crazy", "king_pepper", "420_special"];
  private readonly audioRoot = path.resolve(process.cwd(), "audio");

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly audioRepo: AudioRepository,
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly logger: Logger
  ) {}

  private weightedPick(paths: Array<{ filePath: string; weight: number }>): string | null {
    const total = paths.reduce((acc, item) => acc + Math.max(0.01, item.weight), 0);
    if (total <= 0) {
      return null;
    }
    let threshold = Math.random() * total;
    for (const item of paths) {
      threshold -= Math.max(0.01, item.weight);
      if (threshold <= 0) {
        return item.filePath;
      }
    }
    return paths[0]?.filePath ?? null;
  }

  resolveVoiceChannel(member: GuildMember | null): VoiceBasedChannel | null {
    return member?.voice?.channel ?? null;
  }

  private normalizeVoiceError(error: unknown): AppError | Error {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "";

    if (message.includes("No compatible encryption modes")) {
      return new AppError(
        "Voice encryption negotiation failed. Update @discordjs/voice and restart the bot process.",
        "VOICE_ENCRYPTION_MODE",
        500
      );
    }

    if (message.includes("FFmpeg/avconv not found")) {
      return new AppError(
        "FFmpeg is not available for voice playback. Ensure ffmpeg is installed or set FFMPEG_PATH in .env, then restart the bot.",
        "VOICE_FFMPEG_MISSING",
        500
      );
    }

    if (name === "AbortError" || message.includes("operation was aborted")) {
      return new AppError(
        "Voice connection or playback timed out. Rejoin the channel and try again; if it persists, check bot Connect/Speak permissions and clip format.",
        "VOICE_TIMEOUT",
        504
      );
    }

    return error instanceof Error ? error : new Error(message);
  }

  private resolveAndValidateAudioPath(candidate: string): string {
    const resolved = path.resolve(candidate);
    const relative = path.relative(this.audioRoot, resolved);
    const insideRoot = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
    if (!insideRoot) {
      throw new AppError(`Blocked audio path outside allowed root '${this.audioRoot}'.`, "AUDIO_PATH_BLOCKED", 400);
    }
    return resolved;
  }

  private async playAndConfirm(player: AudioPlayer, filePath: string, volume: number): Promise<void> {
    const resource = createAudioResource(filePath, { inlineVolume: true });
    if (resource.volume) {
      resource.volume.setVolume(volume);
    }

    player.play(resource);
    await entersState(player, AudioPlayerStatus.Playing, 10_000);
    await entersState(player, AudioPlayerStatus.Idle, 180_000);
  }

  async playCheer(item: QueueItem): Promise<void> {
    if (this.inFlight.has(item.guildId)) {
      return;
    }
    this.inFlight.add(item.guildId);

    try {
      const settings = await this.settingsRepo.getGuildSettings(item.guildId);
      let candidates = await this.audioRepo.listClipsForGuild(item.guildId, item.category);
      if (!candidates.length) {
        const fallbackLists = await Promise.all(
          this.categories
            .filter((category) => category !== item.category)
            .map((category) => this.audioRepo.listClipsForGuild(item.guildId, category))
        );
        candidates = fallbackLists.flat();
      }

      const selected = this.weightedPick(candidates);
      if (!selected) {
        throw new AppError(
          "No cheer audio is configured yet. Upload one with /upload-cheer or add the required prebuilt files in audio/cheers/prebuilt.",
          "NO_AUDIO_CLIPS",
          400
        );
      }

      const filePath = this.resolveAndValidateAudioPath(selected);
      if (!fs.existsSync(filePath)) {
        const backup = await this.audioRepo.getClipBackup(selected);
        if (!backup) {
          throw new AppError(`Selected audio file does not exist and no DB backup exists: ${filePath}`, "AUDIO_FILE_MISSING", 500);
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, backup);
        this.logger.warn({ guildId: item.guildId, filePath }, "Restored missing audio file from MongoDB backup");
      }
      const existingBackup = await this.audioRepo.getClipBackup(selected);
      if (!existingBackup) {
        await this.audioRepo.setClipBackup(selected, fs.readFileSync(filePath), "audio/mpeg");
      }

      let connection = getVoiceConnection(item.guildId);
      if (!connection) {
        connection = joinVoiceChannel({
          guildId: item.guildId,
          channelId: item.channel.id,
          adapterCreator: item.channel.guild.voiceAdapterCreator as any
        });
      }

      await entersState(connection as VoiceConnection, VoiceConnectionStatus.Ready, 15_000);
      const player = this.players.get(item.guildId) ?? createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
      this.players.set(item.guildId, player);
      connection.subscribe(player);

      let didPlay = false;
      let lastAttemptError: unknown;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await this.playAndConfirm(player, filePath, settings.voiceVolume);
          didPlay = true;
          break;
        } catch (error) {
          lastAttemptError = error;
          this.logger.warn({ guildId: item.guildId, attempt, err: error }, "Voice playback attempt failed");

          const existing = getVoiceConnection(item.guildId);
          existing?.destroy();
          connection = joinVoiceChannel({
            guildId: item.guildId,
            channelId: item.channel.id,
            adapterCreator: item.channel.guild.voiceAdapterCreator as any
          });
          await entersState(connection as VoiceConnection, VoiceConnectionStatus.Ready, 15_000);
          connection.subscribe(player);
        }
      }

      if (!didPlay) {
        throw lastAttemptError ?? new Error("Playback failed before audio start.");
      }

      await this.analyticsRepo.increment(item.guildId, "cheers_voice_played", 1);
      connection.destroy();
    } catch (error) {
      const normalized = this.normalizeVoiceError(error);
      const connection = getVoiceConnection(item.guildId);
      connection?.destroy();
      this.logger.error({ err: normalized, guildId: item.guildId }, "Voice playback failed");
      throw normalized;
    } finally {
      this.inFlight.delete(item.guildId);
    }
  }
}

