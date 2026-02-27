import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createScheduleCheerCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('schedule-cheer')
    .setDescription('Schedule a custom cheer message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((o) => o.setName('channel').setDescription('Target channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Minutes from now').setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption((o) => o.setName('message').setDescription('Cheer message').setRequired(true).setMaxLength(300)),
  async execute(interaction) {
    if (!interaction.guild) return;
    const channel = interaction.options.getChannel('channel', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const message = interaction.options.getString('message', true);
    const runAt = DateTime.utc().plus({ minutes }).toISO();
    if (!runAt) throw new Error('Could not calculate schedule time.');
    ctx.db.addScheduledCheer(uuid(), interaction.guild.id, channel.id, message, runAt);
    await interaction.reply(`📆 Scheduled cheer for <#${channel.id}> in ${minutes} minutes.`);
  }
});
