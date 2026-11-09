import { describe, expect, it } from "vitest";
import { toCalendarEntry, type JolpicaRace } from "@/lib/jolpica";

// Trimmed from https://api.jolpi.ca/ergast/f1/2026.json (fetched 2026-11-09).
const lasVegas: JolpicaRace = {
  season: "2026",
  round: "21",
  url: "https://en.wikipedia.org/wiki/2026_Las_Vegas_Grand_Prix",
  raceName: "Las Vegas Grand Prix",
  Circuit: {
    circuitId: "vegas",
    url: "https://en.wikipedia.org/wiki/Las_Vegas_Grand_Prix#Circuit",
    circuitName: "Las Vegas Strip Street Circuit",
    Location: { lat: "36.1147", long: "-115.173", locality: "Las Vegas", country: "USA" },
  },
  date: "2026-11-22",
  time: "04:00:00Z",
};

describe("toCalendarEntry", () => {
  it("reads the official start from Jolpica's date and time", () => {
    expect(toCalendarEntry(lasVegas).startsAt).toEqual(new Date("2026-11-22T04:00:00Z"));
  });

  it("has no start when Jolpica hasn't published a time", () => {
    expect(toCalendarEntry({ ...lasVegas, time: undefined }).startsAt).toBeNull();
  });
});
