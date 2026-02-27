import { BotCommand } from '../types/index.js';
import { AppContext } from '../services/context.js';
import { createCheersCommand } from './cheers.js';
import { createKingDeclareCommand } from './kingDeclare.js';
import { createPepperWisdomCommand } from './pepperWisdom.js';
import { create420StatusCommand } from './status420.js';
import { createSet420ChannelCommand } from './set420Channel.js';
import { createVoiceModeCommand } from './voiceMode.js';
import { createUploadCheerCommand } from './uploadCheer.js';
import { createSettingsPanelCommand } from './settingsPanel.js';
import { createScheduleCheerCommand } from './scheduleCheer.js';

export const buildCommands = (ctx: AppContext): Map<string, BotCommand> => {
  const commands: BotCommand[] = [
    createCheersCommand(ctx),
    createKingDeclareCommand(ctx),
    createPepperWisdomCommand(ctx),
    create420StatusCommand(ctx),
    createSet420ChannelCommand(ctx),
    createVoiceModeCommand(ctx),
    createUploadCheerCommand(ctx),
    createSettingsPanelCommand(ctx),
    createScheduleCheerCommand(ctx)
  ];

  return new Map(commands.map((c) => [c.data.name, c]));
};
