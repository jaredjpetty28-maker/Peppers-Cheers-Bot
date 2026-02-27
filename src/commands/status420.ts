import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const create420StatusCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder().setName('420-status').setDescription('View the next 4:20 heat map'),
  async execute(interaction) {
    const next = ctx.scheduler.next420Map(8);
    const embed = new EmbedBuilder()
      .setTitle('🌎 420 Heat Map')
      .setDescription(next.map((n) => `**${n.timezone}** — in ${n.minutesUntil}m (local ${n.localTime})`).join('\n'))
      .setColor(0xff5500);
    await interaction.reply({ embeds: [embed] });
  }
});
