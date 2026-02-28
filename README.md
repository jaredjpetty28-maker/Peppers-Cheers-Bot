# King Pepper Global Cheers Engine

Production-grade Discord bot built with Node.js + TypeScript + Discord.js v14. This edition uses deterministic local persona text (no OpenAI dependency) and MongoDB Atlas for persistence.

## Features

- King Pepper persona command responses (template-driven, no external AI API)
- Voice clip rotation with weighted randomness and categories
- Audio clip bytes are backed up in MongoDB and restored to disk automatically if local files are missing
- Admin-only `/upload-cheer` with upload validation and FFmpeg normalization
- Global 4:20 detector across IANA timezones (once per timezone/day)
- Optional auto-join voice at global 4:20 and play `420_special` category clips
- `/420-status` and `/420-heat-map` commands
- Smart voice delivery: joins channel, plays clip, leaves, no overlap per guild
- `/settings panel` interactive control (select menus + button)
- Scheduled custom cheers (`/schedule-cheer`)
- Spontaneous Pepper Drop events
- MongoDB Atlas persistence
- Structured logging (Pino), centralized error handling, rate limiting, graceful shutdown
- Health endpoint and API-key-protected dashboard metrics endpoint
- Docker, docker-compose, PM2 ecosystem config

## Tech Stack

- Node.js 20+
- TypeScript
- Discord.js v14
- MongoDB Atlas (official `mongodb` driver)
- FFmpeg (`fluent-ffmpeg` + installer)
- node-cron
- Luxon + IANA timezone detection
- Express (health + metrics)

## Project Structure

```text
/src
  /commands
  /events
  /audio
  /services
  /utils
  /database
  /scheduler
  index.ts
/scripts
/audio/cheers/prebuilt
```

## Required Prebuilt Audio Files

Place these files in `audio/cheers/prebuilt/`:

- `king-pepper-declares-you-to-smoke.mp3`
- `the-pepper-has-spoken.mp3`
- `blaze-it-champions.mp3`
- `spice-level-420-engaged.mp3`
- `the-realm-smokes-at-once.mp3`

Run verification:

```bash
npm run verify:prebuilt-audio
```

## Environment Variables

Copy `.env.example` to `.env` and fill values:

- `DISCORD_TOKEN`: Bot token
- `DISCORD_CLIENT_ID`: Application client id
- `DISCORD_GUILD_ID`: Optional, for fast guild command registration
- `MONGODB_URI`: MongoDB Atlas connection string
- `MONGODB_DB_NAME`: Database name
- `HEALTH_PORT`: Health/metrics HTTP port
- `DASHBOARD_API_KEY`: Optional key required by `x-dashboard-key` header on metrics endpoint
- `ENABLE_GLOBAL_420`, `ENABLE_PEPPER_DROPS`: Feature toggles

## MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user with read/write permissions.
3. Add your runtime IP (or `0.0.0.0/0` for testing only) in Network Access.
4. Copy the Atlas SRV connection string into `MONGODB_URI`.
5. Set `MONGODB_DB_NAME` (example: `king_pepper`).

## Install & Run (Local)

```bash
npm install
npm run verify:prebuilt-audio
npm run register:commands
npm run dev
```

Build/run production:

```bash
npm run build
npm start
```

## Slash Commands

- `/cheers [topic]`
- `/audio-cheer [category]`
- `/king-declare decree:<text>`
- `/pepper-wisdom`
- `/420-status`
- `/420-heat-map`
- `/test-420 [timezone] [voice-only]`
- `/set-420-channel channel:<#channel>`
- `/set-420-voice-channel channel:<voice-channel>`
- `/voice-mode [reverb] [distortion] [pitch]`
- `/upload-cheer file:<audio> category:<default|crazy|king_pepper|420_special> [weight]`
- `/settings panel`
- `/schedule-cheer timezone:<IANA> time:<HH:mm> message:<text>`

## Upload Security Rules

- Admin only
- Max file size: `MAX_UPLOAD_SIZE_MB` (default 5MB)
- Allowed extensions: `mp3`, `wav`, `ogg`
- MIME must begin with `audio/`
- FFmpeg normalization and optional voice effects applied before storage

## HTTP Endpoints

- `GET /health`
- `GET /dashboard/metrics/:guildId`
  - If `DASHBOARD_API_KEY` is set, pass `x-dashboard-key: <key>`

## Docker

```bash
docker compose up --build -d
```

## PM2

```bash
npm run build
pm2 start ecosystem.config.cjs
```

## Deployment Notes

### Railway / Render

- Use Docker deployment or native Node service.
- Set all environment variables from `.env.example`.
- Mount/persist local `audio` if your platform supports persistent disks.
- Run `npm run register:commands` once per environment.

### VPS

1. Install Node.js 20+ and ffmpeg.
2. Clone project and configure `.env`.
3. `npm install && npm run build`
4. `npm run verify:prebuilt-audio`
5. `npm run register:commands`
6. Run with PM2 using `ecosystem.config.cjs`.

## Mongo Collections and Indexes

- `guild_settings` index `{ guildId: 1 }` unique
- `audio_clips` indexes `{ category: 1, guildId: 1 }`, `{ filePath: 1 }` unique
- `timezone_triggers` index `{ timezone: 1, triggerDate: 1 }` unique
- `scheduled_cheers` index `{ guildId: 1, enabled: 1, timezone: 1, hhmm: 1 }`
- `analytics` index `{ guildId: 1, metric: 1 }` unique
