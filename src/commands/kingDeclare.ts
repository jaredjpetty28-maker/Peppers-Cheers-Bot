import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createKingDeclareCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('king-declare')
    .setDescription('King Pepper issues a decree')
    .addStringOption((o) => o.setName('topic').setDescription('What shall be declared?').setRequired(true)),
  async execute(interaction) {
    const topic = interaction.options.getString('topic', true);
    await interaction.deferReply();
    const declaration = await ctx.ai.kingDeclare(topic);
    await interaction.editReply(`👑 ${declaration}`);
  }
});
