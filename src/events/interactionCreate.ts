import { Client, EmbedBuilder, Interaction } from 'discord.js';
import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';

export const registerInteractionHandler = (client: Client, commands: Map<string, BotCommand>, ctx: AppContext): void => {
  const rateLimit = new Map<string, number>();
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {

        const key = `${interaction.user.id}:${interaction.commandName}`;
        const now = Date.now();
        if (rateLimit.size > 10_000) {
          for (const [mapKey, ts] of rateLimit.entries()) {
            if (now - ts > 60_000) rateLimit.delete(mapKey);
          }
        }
        const last = rateLimit.get(key) ?? 0;
        if (now - last < 2500) {
          await interaction.reply({ content: 'Easy there, legend. Cooldown: 2.5s per command.', ephemeral: true });
          return;
        }
        rateLimit.set(key, now);
        const cmd = commands.get(interaction.commandName);
        if (cmd) await cmd.execute(interaction);
      }

      if (interaction.isButton() && interaction.guild) {
        if (interaction.customId === 'toggle-global-420') {
          const settings = ctx.settings.get(interaction.guild.id);
          ctx.db.updateSetting(interaction.guild.id, 'global_420_enabled', settings.global420Enabled ? 0 : 1);
          await interaction.reply({ content: `Global 4:20 is now ${settings.global420Enabled ? 'disabled' : 'enabled'}.`, ephemeral: true });
        }
        if (interaction.customId === 'view-analytics') {
          const summary = ctx.analytics.summary(interaction.guild.id);
          const embed = new EmbedBuilder()
            .setTitle('📊 Cheers Analytics')
            .setDescription(`Cheers: ${summary.cheers}\nPepper Drops: ${summary.pepperDrops}\nLast Cheer: ${summary.lastCheerAt ?? 'Never'}`)
            .setColor(0x00aa88);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      if (interaction.isStringSelectMenu() && interaction.guild && interaction.customId === 'select-category') {
        const selected = interaction.values[0] as 'default' | 'crazy' | 'king_pepper' | '420_special';
        ctx.settings.setAudioCategory(interaction.guild.id, selected);
        await interaction.reply({ content: `Audio category set to **${selected}**`, ephemeral: true });
      }
    } catch (error) {
      ctx.logger.error({ error }, 'Interaction handler failed');
      const message = 'King Pepper hit an unexpected snag.';
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) await interaction.followUp({ content: message, ephemeral: true });
        else await interaction.reply({ content: message, ephemeral: true });
      }
    }
  });
};
