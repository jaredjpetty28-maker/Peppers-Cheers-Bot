import express from "express";
import { Logger } from "../utils/logger";
import { AnalyticsRepository } from "../database/repositories";

export class HealthService {
  private readonly app = express();

  constructor(
    private readonly logger: Logger,
    private readonly port: number,
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly apiKey?: string
  ) {
    this.app.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok", ts: new Date().toISOString() });
    });

    this.app.get("/dashboard/metrics/:guildId", async (req, res) => {
      if (this.apiKey && req.header("x-dashboard-key") !== this.apiKey) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const metrics = await this.analyticsRepo.getGuildMetrics(req.params.guildId);
      res.status(200).json({ guildId: req.params.guildId, metrics });
    });
  }

  start() {
    this.app.listen(this.port, () => this.logger.info({ port: this.port }, "Health endpoint online"));
  }
}
