import cron from "node-cron";
import { DateTime } from "luxon";
import { ChannelType, TextChannel, VoiceBasedChannel } from "discord.js";
import { ServiceContainer } from "../services/serviceContainer";

export class Global420Scheduler {
  constructor(private readonly services: ServiceContainer) {}

  start() {
    cron.schedule("* * * * *", async () => {
      const hits = this.services.timezone.get420Hits();
      if (!hits.length) {
        return;
      }

      const guilds = this.services.client.guilds.cache;
      for (const hit of hits) {
        if (await this.services.triggerRepo.wasTriggered(hit.zone, hit.localDate)) {
          continue;
        }

        await this.services.triggerRepo.markTriggered(hit.zone, hit.localDate);

        for (const guild of guilds.values()) {
          const settings = await this.services.settingsRepo.getGuildSettings(guild.id);
          if (!settings.enableGlobal420 || !settings.channel420Id) {
            continue;
          }

          const channel = guild.channels.cache.get(settings.channel420Id);
          if (!channel || channel.type !== ChannelType.GuildText) {
            continue;
          }

          const textChannel = channel as TextChannel;
          const msg = `🔥 IT IS 4:20 IN ${hit.city.toUpperCase()}, ${hit.countryHint.toUpperCase()} 🔥\nKing Pepper commands the realm to ignite.`;
          await textChannel.send({ content: msg });
          await this.services.analyticsRepo.increment(guild.id, "global_420_announcements", 1);

          if (settings.voice420ChannelId) {
            const voiceChannel = guild.channels.cache.get(settings.voice420ChannelId);
            if (voiceChannel && voiceChannel.isVoiceBased()) {
              try {
                await this.services.voice.playCheer({
                  guildId: guild.id,
                  channel: voiceChannel as VoiceBasedChannel,
                  category: "420_special"
                });
                await this.services.analyticsRepo.increment(guild.id, "global_420_voice_autoplays", 1);
              } catch (error) {
                this.services.logger.error(
                  { err: error, guildId: guild.id, voiceChannelId: settings.voice420ChannelId },
                  "Global 4:20 voice autoplay failed"
                );
              }
            }
          }
        }
      }
    });
  }
}

export class PepperDropScheduler {
  constructor(private readonly services: ServiceContainer) {}

  start() {
    cron.schedule(`*/${this.services.config.PEPPER_DROP_MINUTES} * * * *`, async () => {
      if (Math.random() > this.services.config.PEPPER_DROP_CHANCE) {
        return;
      }

      for (const guild of this.services.client.guilds.cache.values()) {
        const settings = await this.services.settingsRepo.getGuildSettings(guild.id);
        if (!settings.channel420Id) {
          continue;
        }

        const channel = guild.channels.cache.get(settings.channel420Id);
        if (!channel || channel.type !== ChannelType.GuildText) {
          continue;
        }

        const tag = ["Pepper Drop: spice storm incoming.", "The crown drops embers. Blaze discipline.", "King Pepper rain protocol active."];
        await (channel as TextChannel).send({ content: `🌶️ ${tag[Math.floor(Math.random() * tag.length)]}` });
        await this.services.analyticsRepo.increment(guild.id, "pepper_drop_events", 1);
      }
    });
  }
}

export class ScheduledCheersScheduler {
  constructor(private readonly services: ServiceContainer) {}

  start() {
    cron.schedule("* * * * *", async () => {
      const cheers = await this.services.scheduledRepo.listEnabled();
      for (const cheer of cheers) {
        const local = DateTime.utc().setZone(cheer.timezone);
        const hhmm = `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
        if (hhmm !== cheer.hhmm) {
          continue;
        }

        const guild = this.services.client.guilds.cache.get(cheer.guildId);
        if (!guild) {
          continue;
        }
        const channel = guild.channels.cache.get(cheer.channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
          continue;
        }
        await (channel as TextChannel).send({ content: `📣 ${cheer.message}` });
        await this.services.analyticsRepo.increment(cheer.guildId, "scheduled_cheers", 1);
      }
    });
  }
}
