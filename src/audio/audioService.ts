import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { v4 as uuid } from 'uuid';
import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import { Attachment, GuildMember, VoiceBasedChannel } from 'discord.js';
import { AiService } from '../ai/aiService.js';
import { DatabaseService } from '../database/db.js';
import { AudioCategory, CheerClip } from '../types/index.js';

ffmpeg.setFfmpegPath(ffmpegPath as string);

export class AudioService {
  private activeGuilds = new Set<string>();

  private readonly builtinDefinitions: Array<{ file: string; category: AudioCategory; name: string; weight: number }> = [
    { file: 'king-pepper-declares-you-to-smoke.mp3', category: 'king_pepper', name: 'King Pepper Declares You To Smoke', weight: 2 },
    { file: 'the-pepper-has-spoken.mp3', category: 'king_pepper', name: 'The Pepper Has Spoken', weight: 2 },
    { file: 'blaze-it-champions.mp3', category: 'default', name: 'Blaze It, Champions', weight: 1 },
    { file: 'spice-level-420-engaged.mp3', category: '420_special', name: 'Spice Level 420 Engaged', weight: 3 },
    { file: 'the-realm-smokes-at-once.mp3', category: 'crazy', name: 'The Realm Smokes At Once', weight: 1 }
  ];

  constructor(private readonly db: DatabaseService, private readonly ai: AiService) {
    fs.mkdirSync('src/audio/cheers', { recursive: true });
  }

  private seedBuiltinClips(guildId: string): void {
    const existingPaths = new Set(this.db.listClips(guildId).map((clip) => clip.path));
    for (const clipDef of this.builtinDefinitions) {
      const clipPath = path.join('src/audio/cheers', clipDef.file);
      if (!fs.existsSync(clipPath) || existingPaths.has(clipPath)) continue;
      this.db.addClip({
        id: uuid(),
        guildId,
        category: clipDef.category,
        name: clipDef.name,
        path: clipPath,
        weight: clipDef.weight,
        source: 'builtin',
        createdAt: new Date().toISOString()
      });
    }
  }

  private weightedRandom(clips: CheerClip[]): CheerClip | undefined {
    const total = clips.reduce((acc, clip) => acc + clip.weight, 0);
    let r = Math.random() * total;
    for (const clip of clips) {
      r -= clip.weight;
      if (r <= 0) return clip;
    }
    return clips[0];
  }

  async processUpload(guildId: string, category: AudioCategory, attachment: Attachment, maxMb: number): Promise<CheerClip> {
    if (!attachment.contentType?.startsWith('audio/')) {
      throw new Error('Attachment must be an audio file.');
    }
    if (!attachment.name?.match(/\.(mp3|wav|ogg)$/i)) {
      throw new Error('Only mp3, wav, and ogg files are allowed.');
    }
    if (attachment.size > maxMb * 1024 * 1024) {
      throw new Error(`File too large. Max ${maxMb}MB.`);
    }

    const outPath = path.join('src/audio/cheers', `${guildId}-${uuid()}.mp3`);
    const response = await fetch(attachment.url);
    if (!response.body) throw new Error('Failed to download uploaded audio.');

    const tempPath = `${outPath}.tmp`;
    await pipeline(Readable.fromWeb(response.body as never), fs.createWriteStream(tempPath));

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempPath)
        .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11')
        .audioCodec('libmp3lame')
        .toFormat('mp3')
        .save(outPath)
        .on('end', () => resolve())
        .on('error', reject);
    });

    fs.unlinkSync(tempPath);

    const clip: CheerClip = {
      id: uuid(),
      guildId,
      category,
      name: attachment.name ?? 'uploaded-cheer',
      path: outPath,
      weight: 1,
      source: 'upload',
      createdAt: new Date().toISOString()
    };
    this.db.addClip(clip);
    return clip;
  }

  async ensureFallbackClip(guildId: string, category: AudioCategory, text: string, distortion: boolean, pitch: number): Promise<CheerClip> {
    this.seedBuiltinClips(guildId);
    const existing = this.db.listClips(guildId, category);
    if (existing.length > 0) {
      const selected = this.weightedRandom(existing);
      if (!selected) {
        throw new Error('No clips available for selection.');
      }
      return selected;
    }
    const raw = await this.ai.tts(text);
    const outPath = path.join('src/audio/cheers', `${guildId}-${category}-tts-${uuid()}.mp3`);
    const basePath = `${outPath}.raw.mp3`;
    fs.writeFileSync(basePath, raw);

    const filters = ['aecho=0.8:0.88:60:0.4'];
    if (distortion) filters.push('acrusher=bits=8:mix=0.3');
    if (pitch !== 0) {
      const ratio = Math.pow(2, pitch / 12);
      filters.push(`asetrate=44100*${ratio},aresample=44100`);
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(basePath)
        .audioFilters(filters.join(','))
        .audioCodec('libmp3lame')
        .toFormat('mp3')
        .save(outPath)
        .on('end', () => resolve())
        .on('error', reject);
    });
    fs.unlinkSync(basePath);

    const clip: CheerClip = {
      id: uuid(),
      guildId,
      category,
      name: `tts-${category}`,
      path: outPath,
      weight: 1,
      source: 'tts',
      createdAt: new Date().toISOString()
    };
    this.db.addClip(clip);
    return clip;
  }

  async playCheer(member: GuildMember, channel: VoiceBasedChannel, clipPath: string, volume: number): Promise<void> {
    if (this.activeGuilds.has(member.guild.id)) return;
    this.activeGuilds.add(member.guild.id);
    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: member.guild.id,
        adapterCreator: member.guild.voiceAdapterCreator
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

      const player = createAudioPlayer();
      const resource = createAudioResource(clipPath, { inlineVolume: true });
      if (resource.volume) resource.volume.setVolume(volume);
      player.play(resource);
      connection.subscribe(player);

      await entersState(player, AudioPlayerStatus.Idle, 180_000);
      connection.destroy();
    } finally {
      this.activeGuilds.delete(member.guild.id);
    }
  }
}
