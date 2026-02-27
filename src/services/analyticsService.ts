import { DatabaseService } from '../database/db.js';

export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  trackCheer(guildId: string, isPepperDrop = false): void {
    this.db.incrementCheers(guildId, isPepperDrop);
  }

  summary(guildId: string): { cheers: number; pepperDrops: number; lastCheerAt: string | null } {
    return this.db.getAnalytics(guildId);
  }
}
