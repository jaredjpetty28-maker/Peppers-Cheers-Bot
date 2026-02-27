import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createVoiceModeCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('voice-mode')
    .setDescription('Configure AI mode and voice effects')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('mode').setDescription('AI style mode').setRequired(true)
      .addChoices(
        { name: 'Roast Friendly', value: 'roast' },
        { name: 'Motivational', value: 'motivational' },
        { name: 'Party', value: 'party' },
        { name: 'Stoner Philosopher', value: 'stoner_philosopher' }
      ))
    .addBooleanOption((opt) => opt.setName('distortion').setDescription('Enable slight distortion'))
    .addIntegerOption((opt) => opt.setName('pitch').setDescription('Pitch semitones -6 to +6').setMinValue(-6).setMaxValue(6)),
  async execute(interaction) {
    if (!interaction.guild) return;
    const mode = interaction.options.getString('mode', true) as 'roast' | 'motivational' | 'party' | 'stoner_philosopher';
    const distortion = interaction.options.getBoolean('distortion');
    const pitch = interaction.options.getInteger('pitch');
    ctx.settings.setVoiceMode(interaction.guild.id, mode);
    if (distortion !== null) ctx.settings.setDistortion(interaction.guild.id, distortion);
    if (pitch !== null) ctx.settings.setPitch(interaction.guild.id, pitch);
    await interaction.reply(`🎤 Voice mode set to **${mode}**.`);
  }
});
