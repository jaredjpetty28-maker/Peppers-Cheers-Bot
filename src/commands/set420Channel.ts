import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createSet420ChannelCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('set-420-channel')
    .setDescription('Set the announcement channel for global 4:20')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('channel').setDescription('Text channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    if (!interaction.guild) return;
    ctx.settings.set420Channel(interaction.guild.id, channel.id);
    await interaction.reply(`✅ 4:20 channel set to <#${channel.id}>`);
  }
});
