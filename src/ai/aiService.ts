import OpenAI from 'openai';
import { AiMode } from '../types/index.js';

const persona = `You are King Pepper, ruler of the blazing realm. Tone: commanding, funny, slightly chaotic, never mean-spirited, and always pepper/420 themed.`;

export class AiService {
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly ttsModel: string;
  private readonly ttsVoice: string;

  constructor(apiKey: string, model: string, ttsModel: string, ttsVoice: string) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.ttsModel = ttsModel;
    this.ttsVoice = ttsVoice;
  }

  async generateCheers(guildName: string, userName: string, mode: AiMode): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.8,
      max_tokens: 120,
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: `Generate a short ${mode} cheers shoutout for ${userName} in ${guildName}.` }
      ]
    });
    return completion.choices[0]?.message.content?.trim() ?? 'King Pepper salutes the realm. Blaze with honor.';
  }

  async kingDeclare(prompt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 140,
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: `Create a bold declaration for: ${prompt}` }
      ]
    });
    return completion.choices[0]?.message.content?.trim() ?? 'By pepper and flame, it shall be done.';
  }

  async pepperWisdom(): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.9,
      max_tokens: 80,
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: 'Give one short stoner philosopher style wisdom quote.' }
      ]
    });
    return completion.choices[0]?.message.content?.trim() ?? 'The hotter the pepper, the slower the universe dances.';
  }

  async tts(text: string): Promise<Buffer> {
    const response = await this.openai.audio.speech.create({
      model: this.ttsModel,
      voice: this.ttsVoice,
      input: text,
      format: 'mp3'
    });
    return Buffer.from(await response.arrayBuffer());
  }
}
