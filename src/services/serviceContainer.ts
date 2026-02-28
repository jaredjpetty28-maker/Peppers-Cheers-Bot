import { Client } from "discord.js";
import { AppConfig } from "../utils/config";
import { Logger } from "../utils/logger";
import { MongoConnection } from "../database/db";
import {
  AnalyticsRepository,
  AudioRepository,
  ScheduledCheerRepository,
  SettingsRepository,
  TriggerRepository
} from "../database/repositories";
import { AudioProcessingService } from "../audio/audioProcessingService";
import { VoiceService } from "../audio/voiceService";
import { TimezoneService } from "./timezoneService";
import { PersonaTextService } from "./personaTextService";

export class ServiceContainer {
  public readonly settingsRepo: SettingsRepository;
  public readonly audioRepo: AudioRepository;
  public readonly triggerRepo: TriggerRepository;
  public readonly scheduledRepo: ScheduledCheerRepository;
  public readonly analyticsRepo: AnalyticsRepository;
  public readonly personaText: PersonaTextService;
  public readonly audioProcessing: AudioProcessingService;
  public readonly voice: VoiceService;
  public readonly timezone: TimezoneService;

  constructor(
    public readonly config: AppConfig,
    public readonly logger: Logger,
    public readonly client: Client,
    public readonly db: MongoConnection
  ) {
    this.settingsRepo = new SettingsRepository(db);
    this.audioRepo = new AudioRepository(db);
    this.triggerRepo = new TriggerRepository(db);
    this.scheduledRepo = new ScheduledCheerRepository(db);
    this.analyticsRepo = new AnalyticsRepository(db);
    this.personaText = new PersonaTextService();
    this.audioProcessing = new AudioProcessingService(config);
    this.voice = new VoiceService(this.settingsRepo, this.audioRepo, this.analyticsRepo, logger);
    this.timezone = new TimezoneService();
  }

  async init(): Promise<void> {
    await this.settingsRepo.init();
    await this.audioRepo.init();
    await this.triggerRepo.init();
    await this.scheduledRepo.init();
    await this.analyticsRepo.init();
  }
}
