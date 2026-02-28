const buckets = new Map<string, number>();

export function isRateLimited(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const last = buckets.get(key) ?? 0;
  if (now - last < cooldownMs) {
    return true;
  }
  buckets.set(key, now);
  return false;
}
