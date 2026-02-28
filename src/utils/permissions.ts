import { GuildMember, PermissionFlagsBits } from "discord.js";
import { AppError } from "./errors";

export function assertAdmin(member: GuildMember | null) {
  if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
    throw new AppError("This command requires Administrator permission.", "FORBIDDEN", 403);
  }
}
