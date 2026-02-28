import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { AppConfig } from "../utils/config";
import { ensureDir, safeFileName } from "../utils/fs";

export interface ProcessOptions {
  reverbEnabled: boolean;
  distortionEnabled: boolean;
  pitchShift: number;
}

export class AudioProcessingService {
  constructor(private readonly config: AppConfig) {
    ffmpeg.setFfmpegPath(config.FFMPEG_PATH || ffmpegInstaller.path);
  }

  async downloadAttachment(url: string, originalName: string): Promise<string> {
    ensureDir(path.resolve("audio", "tmp"));
    const safeName = safeFileName(originalName || `upload-${Date.now()}.bin`);
    const outputPath = path.resolve("audio", "tmp", safeName);

    const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer", timeout: 15000 });
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return outputPath;
  }

  async normalizeAndStore(inputPath: string, outputPath: string, options: ProcessOptions): Promise<void> {
    ensureDir(path.dirname(outputPath));
    const filters: string[] = ["loudnorm=I=-16:TP=-1.5:LRA=11"];

    if (options.reverbEnabled) {
      filters.push("aecho=0.8:0.9:60:0.35");
    }
    if (options.distortionEnabled) {
      filters.push("acrusher=bits=8:mode=log");
    }
    if (Math.abs(options.pitchShift - 1) > 0.01) {
      const rate = Math.max(0.75, Math.min(1.25, options.pitchShift));
      filters.push(`asetrate=44100*${rate},aresample=44100`);
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .audioFilters(filters)
        .format("mp3")
        .on("error", reject)
        .on("end", () => resolve())
        .save(outputPath);
    });
  }
}
