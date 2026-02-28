import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { prebuiltClips } from "../src/audio/prebuilt";

async function run() {
  const missing: string[] = [];

  for (const clip of prebuiltClips) {
    const outputPath = path.resolve("audio", "cheers", "prebuilt", clip.name);
    if (!fs.existsSync(outputPath)) {
      missing.push(outputPath);
    }
  }

  if (missing.length > 0) {
    console.error("Missing prebuilt audio files:");
    for (const file of missing) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log("All prebuilt audio files are present.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
