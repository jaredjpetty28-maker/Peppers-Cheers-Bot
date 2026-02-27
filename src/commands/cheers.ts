import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createCheersCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder().setName('cheers').setDescription('Summon King Pepper cheers in voice channel'),
  async execute(interaction) {
    if (!interaction.guild || !interaction.member || !('voice' in interaction.member)) {
      await interaction.reply({ content: 'This command can only run in a guild voice context.', ephemeral: true });
      return;
    }

    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember) {
      await interaction.reply({ content: 'Bot member not ready yet. Try again in a moment.', ephemeral: true });
      return;
    }

    const perms = voiceChannel.permissionsFor(botMember);
    if (!perms?.has(['Connect', 'Speak'])) {
      await interaction.reply({ content: 'I need **Connect** and **Speak** permissions for that voice channel.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const settings = ctx.settings.get(interaction.guild.id);
    const message = await ctx.ai.generateCheers(interaction.guild.name, interaction.user.username, settings.aiMode);
    const clip = await ctx.audio.ensureFallbackClip(interaction.guild.id, settings.audioCategory, message, Boolean(settings.distortionEnabled), settings.pitchSemitones);
    await ctx.audio.playCheer(member, voiceChannel, clip.path, settings.voiceVolume);
    ctx.analytics.trackCheer(interaction.guild.id);
    await interaction.editReply(`🌶️ ${message}`);
  }
});
