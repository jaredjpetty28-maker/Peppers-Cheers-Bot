import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const createSettingsPanelCommand = (ctx: AppContext): BotCommand => ({
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Guild settings controls')
    .addSubcommand((s) => s.setName('panel').setDescription('Display settings panel')),
  async execute(interaction) {
    if (!interaction.guild) return;
    const settings = ctx.settings.get(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('⚙️ King Pepper Settings Panel')
      .setDescription(`420 Channel: ${settings.channel420Id ? `<#${settings.channel420Id}>` : 'Not set'}\nAI Mode: ${settings.aiMode}\nCategory: ${settings.audioCategory}`)
      .setColor(0xd63b00);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('toggle-global-420').setLabel('Toggle Global 4:20').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('view-analytics').setLabel('View Analytics').setStyle(ButtonStyle.Secondary)
    );

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select-category')
        .setPlaceholder('Select audio category')
        .addOptions(
          { label: 'default', value: 'default' },
          { label: 'crazy', value: 'crazy' },
          { label: 'king_pepper', value: 'king_pepper' },
          { label: '420_special', value: '420_special' }
        )
    );

    await interaction.reply({ embeds: [embed], components: [row, select], ephemeral: true });
  }
});
