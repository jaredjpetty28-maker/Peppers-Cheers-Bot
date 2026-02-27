import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createPepperWisdomCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder().setName('pepper-wisdom').setDescription('Receive stoner philosopher pepper wisdom'),
  async execute(interaction) {
    const wisdom = await ctx.ai.pepperWisdom();
    await interaction.reply(`🧠 ${wisdom}`);
  }
});
