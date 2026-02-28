import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function resolveProjectPath(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}
