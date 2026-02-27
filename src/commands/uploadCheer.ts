import { Attachment, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createUploadCheerCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('upload-cheer')
    .setDescription('Upload and normalize a cheer audio clip')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addAttachmentOption((opt) => opt.setName('file').setDescription('Audio file (mp3/wav/ogg)').setRequired(true))
    .addStringOption((opt) => opt.setName('category').setDescription('Audio category').setRequired(true)
      .addChoices(
        { name: 'default', value: 'default' },
        { name: 'crazy', value: 'crazy' },
        { name: 'king_pepper', value: 'king_pepper' },
        { name: '420_special', value: '420_special' }
      )),
  async execute(interaction) {
    if (!interaction.guild) return;
    const file = interaction.options.getAttachment('file', true) as Attachment;
    const category = interaction.options.getString('category', true) as 'default' | 'crazy' | 'king_pepper' | '420_special';
    await interaction.deferReply({ ephemeral: true });
    const clip = await ctx.audio.processUpload(interaction.guild.id, category, file, ctx.config.maxUploadMb);
    await interaction.editReply(`✅ Uploaded **${clip.name}** into ${category}.`);
  }
});
