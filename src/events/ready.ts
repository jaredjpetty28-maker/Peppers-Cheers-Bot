import { Client } from 'discord.js';
import { AppContext } from '../services/context.js';

export const registerReadyHandler = (client: Client, ctx: AppContext): void => {
  client.once('ready', () => {
    ctx.logger.info(`Logged in as ${client.user?.tag}`);
    ctx.scheduler.start();
  });
};
