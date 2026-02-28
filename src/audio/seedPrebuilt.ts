import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { ServiceContainer } from "../services/serviceContainer";
import { prebuiltClips } from "./prebuilt";

export async function ensurePrebuiltClips(services: ServiceContainer): Promise<void> {
  for (const clip of prebuiltClips) {
    const outputPath = path.resolve("audio", "cheers", "prebuilt", clip.name);
    if (!fs.existsSync(outputPath)) {
      services.logger.warn({ outputPath }, "Missing prebuilt audio file. Add this file to audio/cheers/prebuilt.");
      continue;
    }

    const backupData = await fsp.readFile(outputPath);
    const existing = await services.audioRepo.findByPath(outputPath);

    if (!existing) {
      await services.audioRepo.addClip({
        guildId: null,
        category: clip.category,
        filePath: outputPath,
        weight: 1,
        isPrebuilt: 1,
        createdBy: null,
        backupContentType: "audio/mpeg",
        backupData
      });
      continue;
    }

    await services.audioRepo.setClipBackup(outputPath, backupData, "audio/mpeg");
  }
}
