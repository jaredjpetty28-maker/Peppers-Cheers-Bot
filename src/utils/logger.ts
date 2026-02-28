import pino from "pino";
import { AppConfig } from "./config";

export function createLogger(config: AppConfig) {
  return pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" }
          }
        : undefined,
    base: undefined
  });
}

export type Logger = ReturnType<typeof createLogger>;
