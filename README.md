# King Pepper Global Cheers Engine™

Production-grade Discord bot with AI-powered cheers, global 4:20 automation, rotating voice clips, and scalable architecture.

## Features

- AI persona engine powered by OpenAI chat + TTS.
- Slash commands for cheers, declarations, settings, uploads, and scheduling.
- Global 4:20 detector across IANA timezones with anti-spam daily guard.
- Voice clip upload pipeline with file validation + FFmpeg loudness normalization.
- Per-guild settings and analytics backed by SQLite (modular migration-ready).
- Smart voice playback with concurrency control and auto leave.
- 420 heat map command (`/420-status`) with next upcoming timezones.
- Random Pepper Drop events + scheduled custom cheers.
- Health check endpoint for orchestration readiness (`/health`).
- Docker + PM2 deployment support.

## Tech Stack

- Node.js 20 LTS
- TypeScript
- discord.js v14 + @discordjs/voice
- OpenAI API
- FFmpeg + fluent-ffmpeg
- SQLite (`better-sqlite3`)
- Cron scheduler
- Luxon timezone engine
- Pino logging

## Project Structure

```txt
src/
  ai/
  audio/
  commands/
  database/
  events/
  scheduler/
  scripts/
  services/
  types/
  utils/
  index.ts
```

## Commands

- `/cheers`
- `/king-declare`
- `/pepper-wisdom`
- `/420-status`
- `/set-420-channel`
- `/voice-mode`
- `/upload-cheer`
- `/settings panel`
- `/schedule-cheer`

## Quick Start (Local)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Fill env values in `.env`.
4. Register slash commands:
   ```bash
   npm run register:commands
   ```
5. (Optional) Generate five themed sample clips with OpenAI TTS:
   ```bash
   npm run generate:samples
   ```
6. Start development mode:
   ```bash
   npm run dev
   ```

The bot auto-registers generated sample files as weighted built-in clips per guild when `/cheers` is used.

## Environment Variables

See `.env.example`.

Critical values:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `OPENAI_API_KEY`

## Discord Developer Portal Setup

1. Create an application and bot.
2. Enable intents: **Guilds**, **Guild Voice States**.
3. Invite bot with scopes:
   - `bot`
   - `applications.commands`
4. Permissions needed:
   - Send Messages
   - Connect
   - Speak
   - Use Application Commands
   - Read Message History

## Docker Deployment

```bash
docker compose up -d --build
```

## PM2 Deployment

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## Railway / Render / VPS

- Use Node 20 environment.
- Add all `.env` keys in service variables.
- Ensure FFmpeg is available (Docker image already installs it).
- Run `npm run build && npm run start`.

## Operational Notes

- Uploads capped to 5MB and restricted to mp3/wav/ogg.
- The bot only joins voice for active command invocations.
- 4:20 global detector runs every minute and triggers once per timezone/day-part.
- Health endpoint: `GET /health`.

## Production Hardening Tips

- Move SQLite to PostgreSQL by swapping database service implementation.
- Add metrics exporter (Prometheus/OpenTelemetry).
- Use distributed lock (Redis) for multi-instance scheduler coordination.
