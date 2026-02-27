import { CronJob } from 'cron';
import { Client, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { getTimeZones } from '@vvo/tzdb';
import { DatabaseService } from '../database/db.js';
import { SettingsService } from '../services/settingsService.js';

const timezoneMetadata = new Map(getTimeZones().map((tz) => [tz.name, tz]));

export class SchedulerService {
  constructor(
    private readonly client: Client,
    private readonly db: DatabaseService,
    private readonly settings: SettingsService,
    private readonly pepperDropMinutes: number,
    private readonly globalEnabled: boolean
  ) {}

  start(): void {
    const fourTwentyJob = new CronJob('0 * * * * *', () => { void this.tickGlobal420(); void this.runScheduledCheers(); }, null, true);
    const pepperDropJob = new CronJob(`0 */${this.pepperDropMinutes} * * * *`, () => this.pepperDropEvent(), null, true);
    fourTwentyJob.start();
    pepperDropJob.start();
  }

  next420Map(limit = 10): Array<{ timezone: string; localTime: string; minutesUntil: number }> {
    const now = DateTime.utc();
    const zones = Intl.supportedValuesOf('timeZone');
    const next = zones.map((tz) => {
      const local = now.setZone(tz);
      let target = local.set({ hour: 4, minute: 20, second: 0, millisecond: 0 });
      if (local > target) target = target.plus({ hours: 12 });
      if (local > target) target = target.plus({ days: 1 });
      return {
        timezone: tz,
        localTime: local.toFormat('HH:mm'),
        minutesUntil: Math.round(target.diff(local, 'minutes').minutes)
      };
    });
    return next.sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0, limit);
  }


  private async runScheduledCheers(): Promise<void> {
    const due = this.db.dueScheduledCheers(DateTime.utc().toISO() ?? new Date().toISOString());
    for (const cheer of due) {
      const guild = this.client.guilds.cache.get(cheer.guildId);
      const channel = guild?.channels.cache.get(cheer.channelId);
      if (channel?.isTextBased()) {
        await (channel as TextChannel).send(`📣 Scheduled Cheer: ${cheer.message}`).catch(() => undefined);
      }
    }
  }

  private async tickGlobal420(): Promise<void> {
    if (!this.globalEnabled) return;
    const nowUtc = DateTime.utc();
    for (const timezone of Intl.supportedValuesOf('timeZone')) {
      const local = nowUtc.setZone(timezone);
      if (local.minute !== 20 || (local.hour !== 4 && local.hour !== 16)) continue;

      const dayKey = local.toFormat('yyyy-LL-dd-a');
      if (this.db.hasTimezoneFired(timezone, dayKey)) continue;
      this.db.markTimezoneFired(timezone, dayKey);

      const tzInfo = timezoneMetadata.get(timezone);
      const country = tzInfo?.countries?.[0] ?? 'Unknown Country';
      const city = timezone.split('/').slice(1).join(' ') || 'Unknown City';
      const msg = `🔥 IT IS 4:20 IN ${city.toUpperCase()}, ${country.toUpperCase()} 🔥\nKing Pepper commands the realm to ignite.`;

      for (const [, guild] of this.client.guilds.cache) {
        const settings = this.settings.get(guild.id);
        if (!settings.global420Enabled) continue;
        const channelId = settings.channel420Id;
        if (!channelId) continue;
        const channel = guild.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
          await (channel as TextChannel).send(msg).catch(() => undefined);
        }
      }
    }
  }

  private async pepperDropEvent(): Promise<void> {
    for (const [, guild] of this.client.guilds.cache) {
      const settings = this.settings.get(guild.id);
      const channelId = settings.channel420Id;
      if (!channelId) continue;
      const channel = guild.channels.cache.get(channelId);
      if (!channel?.isTextBased()) continue;
      if (Math.random() < 0.25) {
        await (channel as TextChannel).send('🌶️ **PEPPER DROP** 🌶️ King Pepper hurls surprise cheers into the sky. Trigger `/cheers` now.').catch(() => undefined);
      }
    }
  }
}
