import { DateTime } from "luxon";

export interface Zone420Hit {
  zone: string;
  city: string;
  countryHint: string;
  localDate: string;
}

const countryFallback: Record<string, string> = {
  Tokyo: "Japan",
  London: "United Kingdom",
  Paris: "France",
  Sydney: "Australia",
  New_York: "USA",
  Chicago: "USA",
  Los_Angeles: "USA",
  Denver: "USA",
  Toronto: "Canada",
  Berlin: "Germany",
  Dubai: "UAE",
  Singapore: "Singapore",
  Delhi: "India",
  Mexico_City: "Mexico",
  Sao_Paulo: "Brazil"
};

function zoneList(): string[] {
  const fromRuntime = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
  if (fromRuntime?.length) {
    return fromRuntime;
  }
  return [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Australia/Sydney"
  ];
}

function parseZone(zone: string): { city: string; countryHint: string } {
  const tail = zone.split("/").pop() ?? zone;
  const city = tail.replace(/_/g, " ");
  const key = tail.replace(/ /g, "_");
  return { city, countryHint: countryFallback[key] ?? "Earth" };
}

export class TimezoneService {
  public readonly zones = zoneList();

  get420Hits(nowUtc = DateTime.utc()): Zone420Hit[] {
    const hits: Zone420Hit[] = [];

    for (const zone of this.zones) {
      const local = nowUtc.setZone(zone);
      if (!local.isValid) {
        continue;
      }
      if (local.minute === 20 && local.hour % 12 === 4) {
        const parsed = parseZone(zone);
        hits.push({
          zone,
          city: parsed.city,
          countryHint: parsed.countryHint,
          localDate: local.toISODate() ?? ""
        });
      }
    }

    return hits;
  }

  next420Map(limit = 10, nowUtc = DateTime.utc()): Array<{ zone: string; local420Iso: string }> {
    const points = this.zones
      .map((zone) => {
        const local = nowUtc.setZone(zone);
        if (!local.isValid) {
          return null;
        }

        let target = local.set({ hour: 4, minute: 20, second: 0, millisecond: 0 });
        if (target <= local) {
          target = target.plus({ hours: 12 });
        }
        if (target <= local) {
          target = target.plus({ days: 1 });
        }

        return { zone, local420Iso: target.toISO() ?? local.toISO() ?? "" };
      })
      .filter((v): v is { zone: string; local420Iso: string } => Boolean(v))
      .sort((a, b) => DateTime.fromISO(a.local420Iso).toMillis() - DateTime.fromISO(b.local420Iso).toMillis());

    return points.slice(0, limit);
  }
}
