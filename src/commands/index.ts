import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  Attachment,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from "discord.js";
import path from "node:path";
import fs from "node:fs/promises";
import { DateTime } from "luxon";
import { SlashCommand } from "./types";
import { ServiceContainer } from "../services/serviceContainer";
import { assertAdmin } from "../utils/permissions";
import { AppError } from "../utils/errors";
import { safeFileName } from "../utils/fs";
import { isRateLimited } from "../utils/rateLimit";
import { AudioCategory, AiMode } from "../database/db";

const categories: AudioCategory[] = ["default", "crazy", "king_pepper", "420_special"];
const aiModes: AiMode[] = ["roast", "motivational", "party", "stoner_philosopher"];

async function requireVoicePlayback(interaction: ChatInputCommandInteraction, services: ServiceContainer, categoryOverride?: AudioCategory) {
  const guild = interaction.guild;
  const member = interaction.member && "voice" in interaction.member ? interaction.member : null;
  if (!guild || !member) {
    throw new AppError("This command only works in a server voice channel.");
  }

  const channel = services.voice.resolveVoiceChannel(member as any);
  if (!channel) {
    throw new AppError("Join a voice channel first.");
  }
  const botMember = guild.members.me;
  if (!botMember) {
    throw new AppError("Bot member unavailable in this guild.");
  }
  const permissions = channel.permissionsFor(botMember);
  if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions?.has(PermissionFlagsBits.Speak)) {
    throw new AppError("I need Connect + Speak permissions in your voice channel.");
  }

  if (isRateLimited(`${guild.id}:voice`, 3000)) {
    throw new AppError("Voice cheers are cooling down. Try again in a moment.");
  }

  const settings = await services.settingsRepo.getGuildSettings(guild.id);
  const category = categoryOverride ?? settings.audioCategory;
  await services.voice.playCheer({ guildId: guild.id, channel, category });
}

export const cheersCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("cheers")
    .setDescription("Trigger an AI-generated cheer and voice clip")
    .addStringOption((o) => o.setName("topic").setDescription("Optional celebration topic").setMaxLength(120)),
  async execute(interaction, services) {
    await interaction.deferReply();
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    const topic = interaction.options.getString("topic") ?? undefined;
    const content = services.personaText.generateMessage({
      mode: settings.aiMode,
      guildName: guild.name,
      userName: interaction.user.username,
      command: "cheers",
      topic
    });

    await interaction.editReply({ content: `${interaction.user} ${content}` });
    await requireVoicePlayback(interaction, services);
    await services.analyticsRepo.increment(guild.id, "cheers_command_calls", 1);
  }
};

export const audioCheerCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("audio-cheer")
    .setDescription("Play a cheer MP3 in your current voice channel")
    .addStringOption((o) =>
      o
        .setName("category")
        .setDescription("Optional category override")
        .setRequired(false)
        .addChoices(...categories.map((c) => ({ name: c, value: c })))
    ),
  async execute(interaction, services) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const category = interaction.options.getString("category") as AudioCategory | null;
    await requireVoicePlayback(interaction, services, category ?? undefined);
    await services.analyticsRepo.increment(guild.id, "audio_cheer_calls", 1);
    await interaction.editReply({
      content: category ? `Playing an audio cheer from '${category}'.` : "Playing an audio cheer."
    });
  }
};

export const kingDeclareCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("king-declare")
    .setDescription("King Pepper issues a decree")
    .addStringOption((o) => o.setName("decree").setDescription("What should be declared?").setRequired(true).setMaxLength(180)),
  async execute(interaction, services) {
    await interaction.deferReply();
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    const decree = interaction.options.getString("decree", true);
    const content = services.personaText.generateMessage({
      mode: settings.aiMode,
      guildName: guild.name,
      userName: interaction.user.username,
      command: "king-declare",
      topic: decree
    });
    await interaction.editReply({ content });
    await services.analyticsRepo.increment(guild.id, "king_declare_calls", 1);
  }
};

export const pepperWisdomCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("pepper-wisdom").setDescription("Receive stoner philosopher wisdom"),
  async execute(interaction, services) {
    await interaction.deferReply();
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }
    const content = services.personaText.generateMessage({
      mode: "stoner_philosopher",
      guildName: guild.name,
      userName: interaction.user.username,
      command: "pepper-wisdom"
    });
    await interaction.editReply({ content });
    await services.analyticsRepo.increment(guild.id, "pepper_wisdom_calls", 1);
  }
};

export const status420Command: SlashCommand = {
  data: new SlashCommandBuilder().setName("420-status").setDescription("See where in the world it is currently 4:20"),
  async execute(interaction, services) {
    const hits = services.timezone.get420Hits();
    if (!hits.length) {
      await interaction.reply({ content: "No active 4:20 zones this minute. The spice clock keeps moving.", flags: MessageFlags.Ephemeral });
      return;
    }
    const lines = hits.slice(0, 8).map((h) => `🔥 ${h.city}, ${h.countryHint} (${h.zone})`);
    await interaction.reply({ content: lines.join("\n") });
  }
};

export const set420ChannelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-420-channel")
    .setDescription("Set the channel for global 4:20 announcements")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((o) =>
      o.setName("channel").setDescription("Text channel for announcements").addChannelTypes(ChannelType.GuildText).setRequired(true)
    ),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }
    const channel = interaction.options.getChannel("channel", true);
    await services.settingsRepo.updateGuildSettings(guild.id, { channel420Id: channel.id });
    await interaction.reply({ content: `4:20 channel set to <#${channel.id}>.` });
  }
};

export const set420VoiceChannelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-420-voice-channel")
    .setDescription("Set the voice channel for automatic global 4:20 audio cheers")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Voice or stage channel for 4:20 auto-join")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    ),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }
    const channel = interaction.options.getChannel("channel", true);
    await services.settingsRepo.updateGuildSettings(guild.id, { voice420ChannelId: channel.id });
    await interaction.reply({ content: `4:20 voice channel set to <#${channel.id}>.` });
  }
};

export const voiceModeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("voice-mode")
    .setDescription("Configure King Pepper voice processing")
    .addBooleanOption((o) => o.setName("reverb").setDescription("Enable slight reverb"))
    .addBooleanOption((o) => o.setName("distortion").setDescription("Enable slight distortion"))
    .addNumberOption((o) => o.setName("pitch").setDescription("Pitch multiplier 0.75-1.25").setMinValue(0.75).setMaxValue(1.25)),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }
    const reverb = interaction.options.getBoolean("reverb");
    const distortion = interaction.options.getBoolean("distortion");
    const pitch = interaction.options.getNumber("pitch");

    const updated = await services.settingsRepo.updateGuildSettings(guild.id, {
      ...(typeof reverb === "boolean" ? { reverbEnabled: reverb ? 1 : 0 } : {}),
      ...(typeof distortion === "boolean" ? { distortionEnabled: distortion ? 1 : 0 } : {}),
      ...(typeof pitch === "number" ? { pitchShift: pitch } : {})
    });

    await interaction.reply({
      content: `Voice mode updated. Reverb: ${updated.reverbEnabled ? "on" : "off"}, Distortion: ${updated.distortionEnabled ? "on" : "off"}, Pitch: ${updated.pitchShift.toFixed(2)}`
    });
  }
};

function validateAttachment(attachment: Attachment, maxBytes: number) {
  const allowedExt = [".mp3", ".wav", ".ogg"];
  const ext = path.extname(attachment.name || "").toLowerCase();
  if (!allowedExt.includes(ext)) {
    throw new AppError("Unsupported audio extension. Use mp3, wav, or ogg.");
  }
  if (attachment.size > maxBytes) {
    throw new AppError(`File too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
  if (attachment.contentType && !attachment.contentType.startsWith("audio/")) {
    throw new AppError("Attachment content type must be audio.");
  }
}

export const uploadCheerCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("upload-cheer")
    .setDescription("Upload and normalize a cheer clip")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addAttachmentOption((o) => o.setName("file").setDescription("Audio file").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("category")
        .setDescription("Audio category")
        .setRequired(true)
        .addChoices(...categories.map((c) => ({ name: c, value: c })))
    )
    .addNumberOption((o) => o.setName("weight").setDescription("Weighted randomness (default 1)").setMinValue(0.1).setMaxValue(10)),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const attachment = interaction.options.getAttachment("file", true);
    const category = interaction.options.getString("category", true) as AudioCategory;
    const weight = interaction.options.getNumber("weight") ?? 1;
    validateAttachment(attachment, services.config.MAX_UPLOAD_SIZE_MB * 1024 * 1024);

    const downloaded = await services.audioProcessing.downloadAttachment(attachment.url, attachment.name ?? "clip.mp3");
    const target = path.resolve("audio", "cheers", guild.id, category, `${Date.now()}-${safeFileName(attachment.name ?? "clip.mp3")}.mp3`);
    const settings = await services.settingsRepo.getGuildSettings(guild.id);

    await services.audioProcessing.normalizeAndStore(downloaded, target, {
      reverbEnabled: Boolean(settings.reverbEnabled),
      distortionEnabled: Boolean(settings.distortionEnabled),
      pitchShift: settings.pitchShift
    });

    await services.audioRepo.addClip({
      guildId: guild.id,
      category,
      filePath: target,
      weight,
      isPrebuilt: 0,
      createdBy: interaction.user.id,
      backupContentType: "audio/mpeg",
      backupData: await fs.readFile(target)
    });

    await interaction.editReply({ content: `Uploaded and indexed clip in category '${category}' with weight ${weight}.` });
  }
};

export const settingsPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("King Pepper configuration commands")
    .addSubcommand((s) => s.setName("panel").setDescription("Open interactive settings panel")),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    if (interaction.options.getSubcommand() !== "panel") {
      throw new AppError("Unsupported settings subcommand.");
    }
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    const embed = new EmbedBuilder()
      .setTitle("King Pepper Settings")
      .setDescription("Use controls below to update AI mode, audio category, and 4:20 toggle.")
      .addFields(
        { name: "AI Mode", value: settings.aiMode, inline: true },
        { name: "Audio Category", value: settings.audioCategory, inline: true },
        { name: "Global 4:20", value: settings.enableGlobal420 ? "enabled" : "disabled", inline: true }
      );

    const aiRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("settings:ai-mode")
        .setPlaceholder("Select AI mode")
        .addOptions(aiModes.map((m) => ({ label: m, value: m })))
    );

    const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("settings:audio-category")
        .setPlaceholder("Select audio category")
        .addOptions(categories.map((c) => ({ label: c, value: c })))
    );

    const toggleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("settings:toggle-420").setLabel("Toggle Global 4:20").setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [aiRow, categoryRow, toggleRow], flags: MessageFlags.Ephemeral });
  }
};

export const heatMapCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("420-heat-map").setDescription("Show the next upcoming global 4:20 zones"),
  async execute(interaction, services) {
    const points = services.timezone.next420Map(10);
    const lines = points.map((p, i) => {
      const unix = Math.floor(new Date(p.local420Iso).getTime() / 1000);
      return `**${i + 1}. ${p.zone}**\nZone hits 4:20 then. Your local time: <t:${unix}:F> (<t:${unix}:R>)`;
    });

    const firstUnix = points.length ? Math.floor(new Date(points[0].local420Iso).getTime() / 1000) : null;
    const embed = new EmbedBuilder()
      .setTitle("420 Heat Map")
      .setColor(0x2ecc71)
      .setDescription(
        [
          "Upcoming global 4:20 wave.",
          "Times below auto-convert to each viewer's local timezone.",
          firstUnix ? `Next 4:20 for you: <t:${firstUnix}:F>` : "No upcoming 4:20 points found."
        ].join("\n")
      )
      .addFields({ name: "Next Zones", value: lines.join("\n\n").slice(0, 1024) || "No data" })
      .setFooter({ text: "King Pepper Global Clock" })
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [embed] });
  }
};


export const test420Command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("test-420")
    .setDescription("Test global 4:20 automation now in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("timezone").setDescription("Optional IANA timezone for test message (ex: America/New_York)").setRequired(false)
    )
    .addBooleanOption((o) => o.setName("voice-only").setDescription("Test only voice autoplay; skip chat announcement")),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    const voiceOnly = interaction.options.getBoolean("voice-only") ?? false;

    const zone = interaction.options.getString("timezone") ?? "America/New_York";
    if (!services.timezone.zones.includes(zone)) {
      throw new AppError("Invalid timezone. Use IANA format like America/New_York.");
    }

    const local = DateTime.utc().setZone(zone);
    const city = (zone.split("/").pop() ?? zone).replace(/_/g, " ");
    let textResult = "Skipped text announcement.";
    if (!voiceOnly) {
      if (!settings.channel420Id) {
        throw new AppError("Set a 4:20 text channel first with /set-420-channel, or run /test-420 voice-only:true.");
      }
      const textChannel = guild.channels.cache.get(settings.channel420Id);
      if (!textChannel || textChannel.type !== ChannelType.GuildText) {
        throw new AppError("Configured 4:20 text channel is invalid or missing.");
      }

      await textChannel.send({
        content: `🧪 TEST MODE: IT IS 4:20 IN ${city.toUpperCase()} (${zone})\nLocal zone time now: ${local.toFormat("yyyy-LL-dd HH:mm")}.\nKing Pepper test ignition confirmed.`
      });
      textResult = `Posted test message in <#${settings.channel420Id}>.`;
    }

    let voiceResult = "No 4:20 voice channel set. Use /set-420-voice-channel first.";
    if (settings.voice420ChannelId) {
      const voiceChannel = guild.channels.cache.get(settings.voice420ChannelId);
      if (voiceChannel && voiceChannel.isVoiceBased()) {
        const botMember = guild.members.me;
        if (!botMember) {
          throw new AppError("Bot member unavailable in this guild.");
        }
        const perms = voiceChannel.permissionsFor(botMember);
        if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
          throw new AppError("Bot is missing Connect/Speak permissions in the configured 4:20 voice channel.");
        }

        await services.voice.playCheer({
          guildId: guild.id,
          channel: voiceChannel,
          category: "420_special"
        });
        voiceResult = `Played 420_special clip in <#${settings.voice420ChannelId}>.`;
      } else {
        voiceResult = "Configured 4:20 voice channel is invalid.";
      }
    }

    await services.analyticsRepo.increment(guild.id, "global_420_test_runs", 1);
    await interaction.editReply({
      content: `${textResult}\n${voiceResult}`
    });
  }
};
export const scheduleCheerCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("schedule-cheer")
    .setDescription("Schedule a recurring custom cheer in a timezone")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName("timezone").setDescription("IANA zone, ex: America/New_York").setRequired(true))
    .addStringOption((o) => o.setName("time").setDescription("HH:mm 24-hour local zone time").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Message to send").setRequired(true).setMaxLength(180)),
  async execute(interaction, services) {
    assertAdmin(interaction.member as any);
    const guild = interaction.guild;
    if (!guild) {
      throw new AppError("Server only command.");
    }

    const timezone = interaction.options.getString("timezone", true);
    const hhmm = interaction.options.getString("time", true);
    const message = interaction.options.getString("message", true);

    if (!services.timezone.zones.includes(timezone)) {
      throw new AppError("Invalid timezone. Use IANA format like America/New_York.");
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) {
      throw new AppError("Time must be HH:mm 24-hour format.");
    }

    const settings = await services.settingsRepo.getGuildSettings(guild.id);
    if (!settings.channel420Id) {
      throw new AppError("Set a 4:20 channel first using /set-420-channel.");
    }

    await services.scheduledRepo.add({
      guildId: guild.id,
      channelId: settings.channel420Id,
      timezone,
      hhmm,
      message
    });

    await interaction.reply({ content: `Scheduled cheer for ${hhmm} (${timezone}).` });
  }
};

export const commands: SlashCommand[] = [
  cheersCommand,
  audioCheerCommand,
  kingDeclareCommand,
  pepperWisdomCommand,
  status420Command,
  set420ChannelCommand,
  set420VoiceChannelCommand,
  voiceModeCommand,
  uploadCheerCommand,
  settingsPanelCommand,
  heatMapCommand,
  test420Command,
  scheduleCheerCommand
];





