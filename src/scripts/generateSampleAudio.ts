import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { loadConfig } from '../utils/config.js';
import { AiService } from '../ai/aiService.js';

ffmpeg.setFfmpegPath(ffmpegPath as string);

const config = loadConfig();
const ai = new AiService(config.openAiApiKey, config.openAiModel, config.openAiTtsModel, config.openAiTtsVoice);

const samples = [
  'King Pepper Declares You To Smoke',
  'The Pepper Has Spoken',
  'Blaze It, Champions',
  'Spice Level 420 Engaged',
  'The Realm Smokes At Once'
];

fs.mkdirSync('src/audio/cheers', { recursive: true });

for (const line of samples) {
  const base = path.join('src/audio/cheers', `${line.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp3`);
  const temp = `${base}.tmp.mp3`;
  const audio = await ai.tts(line);
  fs.writeFileSync(temp, audio);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(temp)
      .audioFilters('aecho=0.8:0.88:60:0.4,acrusher=bits=8:mix=0.12,loudnorm')
      .audioCodec('libmp3lame')
      .toFormat('mp3')
      .save(base)
      .on('end', resolve)
      .on('error', reject);
  });
  fs.unlinkSync(temp);
  console.log(`Generated ${base}`);
}
