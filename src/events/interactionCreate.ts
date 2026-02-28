import { Events, Interaction, StringSelectMenuInteraction, ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { commands } from "../commands";
import { ServiceContainer } from "../services/serviceContainer";
import { AppError, errorToString } from "../utils/errors";

const commandMap = new Map(commands.map((c) => [c.data.name, c]));

async function handleSettingsSelect(interaction: StringSelectMenuInteraction, services: ServiceContainer) {
  const guild = interaction.guild;
  if (!guild) {
    throw new AppError("Server only action.");
  }

  const current = await services.settingsRepo.getGuildSettings(guild.id);
  if (interaction.customId === "settings:ai-mode") {
    await services.settingsRepo.updateGuildSettings(guild.id, { aiMode: interaction.values[0] as any });
  }
  if (interaction.customId === "settings:audio-category") {
    await services.settingsRepo.updateGuildSettings(guild.id, { audioCategory: interaction.values[0] as any });
  }

  const next = await services.settingsRepo.getGuildSettings(guild.id);
  const embed = new EmbedBuilder()
    .setTitle("King Pepper Settings Updated")
    .setDescription("Configuration updated successfully.")
    .addFields(
      { name: "AI Mode", value: next.aiMode, inline: true },
      { name: "Audio Category", value: next.audioCategory, inline: true },
      { name: "Global 4:20", value: next.enableGlobal420 ? "enabled" : "disabled", inline: true }
    );

  await interaction.update({ embeds: [embed] });

  await services.analyticsRepo.increment(guild.id, "settings_updates", 1);
  if (current.aiMode !== next.aiMode || current.audioCategory !== next.audioCategory) {
    services.logger.info({ guildId: guild.id, before: current, after: next }, "Settings panel changed configuration");
  }
}

async function handleSettingsButton(interaction: ButtonInteraction, services: ServiceContainer) {
  const guild = interaction.guild;
  if (!guild) {
    throw new AppError("Server only action.");
  }

  if (interaction.customId === "settings:toggle-420") {
    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    const updated = await services.settingsRepo.updateGuildSettings(guild.id, {
      enableGlobal420: settings.enableGlobal420 ? 0 : 1
    });
    await interaction.reply({
      content: `Global 4:20 detection is now ${updated.enableGlobal420 ? "enabled" : "disabled"}.`,
      flags: MessageFlags.Ephemeral
    });
    await services.analyticsRepo.increment(guild.id, "settings_updates", 1);
  }
}

export function registerInteractionEvent(services: ServiceContainer) {
  services.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("settings:")) {
        await handleSettingsSelect(interaction, services);
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith("settings:")) {
        await handleSettingsButton(interaction, services);
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const handler = commandMap.get(interaction.commandName);
      if (!handler) {
        return;
      }

      await handler.execute(interaction, services);
    } catch (error) {
      services.logger.error({ err: errorToString(error), interactionId: interaction.id }, "Interaction handler error");
      const content = error instanceof AppError ? error.message : "King Pepper encountered a system flare. Try again shortly.";

      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      }
    }
  });
}
