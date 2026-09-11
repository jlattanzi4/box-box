// Jolpica F1 API client — successor to Ergast
// Docs: https://github.com/jolpica/jolpica-f1
// Rate limit: 4 req/s, 500/hr

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

interface JolpicaResponse<T> {
  MRData: {
    xmlns: string;
    series: string;
    url: string;
    limit: string;
    offset: string;
    total: string;
  } & T;
}

interface RaceTable {
  RaceTable: {
    season: string;
    Races: JolpicaRace[];
  };
}

interface JolpicaRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url: string;
    circuitName: string;
    Location: { lat: string; long: string; locality: string; country: string };
  };
  date: string;
  time?: string;
  Results?: JolpicaResult[];
}

export interface JolpicaResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: {
    driverId: string;
    permanentNumber: string;
    code: string;
    url: string;
    givenName: string;
    familyName: string;
  };
  Constructor: {
    constructorId: string;
    url: string;
    name: string;
    nationality: string;
  };
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string };
    AverageSpeed: { units: string; speed: string };
  };
}

async function fetchJolpica<T>(path: string): Promise<JolpicaResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 3600 }, // cache 1 hour
  });
  if (!res.ok) {
    throw new Error(`Jolpica API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getRaceCalendar(year: number) {
  const data = await fetchJolpica<RaceTable>(`/${year}.json`);
  return data.MRData.RaceTable.Races;
}

/** Normalise a circuit name for fuzzy comparison: lowercase, strip accents/punctuation, collapse spaces. */
function normaliseCircuit(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (Autódromo → Autodromo)
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Words that appear in almost every circuit name and carry no identity.
const CIRCUIT_STOPWORDS = new Set([
  "circuit", "grand", "prix", "international", "autodromo", "autodrome",
  "nazionale", "national", "park", "street", "racing", "course", "ring",
  "de", "di", "del", "la", "le", "of", "the", "city", "corniche", "strip",
]);

function circuitTokens(name: string): Set<string> {
  return new Set(
    normaliseCircuit(name)
      .split(" ")
      .filter((t) => t.length > 2 && !CIRCUIT_STOPWORDS.has(t))
  );
}

export interface JolpicaCalendarEntry {
  round: number;
  raceName: string;
  circuitName: string;
  /** ISO date, e.g. "2026-09-06" */
  date: string;
}

/** The season calendar as Jolpica sees it (rounds are renumbered after cancellations). */
export async function getJolpicaCalendar(year: number): Promise<JolpicaCalendarEntry[]> {
  const races = await getRaceCalendar(year);
  return races.map((r) => ({
    round: parseInt(r.round),
    raceName: r.raceName,
    circuitName: r.Circuit.circuitName,
    date: r.date,
  }));
}

/**
 * Resolves which Jolpica round corresponds to one of our DB races.
 *
 * 1. Date match — a Grand Prix on the same calendar day (±1 day for timezone
 *    edge cases) is unambiguous and immune to circuit-name spelling drift.
 * 2. Exact normalised circuit name.
 * 3. Shared distinctive circuit token ("zandvoort", "monza", "interlagos").
 *
 * Returns null when nothing matches; callers must NOT fall back to the DB round
 * number, because Jolpica renumbers rounds when races are cancelled.
 */
export function lookupJolpicaRound(
  calendar: JolpicaCalendarEntry[],
  race: { raceDate: Date; circuitName: string }
): JolpicaCalendarEntry | null {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const raceDay = Date.UTC(
    race.raceDate.getUTCFullYear(),
    race.raceDate.getUTCMonth(),
    race.raceDate.getUTCDate()
  );

  const byDate = calendar.find((entry) => {
    const [y, m, d] = entry.date.split("-").map(Number);
    return Math.abs(Date.UTC(y, m - 1, d) - raceDay) <= DAY_MS;
  });
  if (byDate) return byDate;

  const wanted = normaliseCircuit(race.circuitName);
  const exact = calendar.find((e) => normaliseCircuit(e.circuitName) === wanted);
  if (exact) return exact;

  const wantedTokens = circuitTokens(race.circuitName);
  const fuzzy = calendar.find((e) =>
    [...circuitTokens(e.circuitName)].some((t) => wantedTokens.has(t))
  );
  return fuzzy ?? null;
}

export async function getRaceResults(year: number, round: number) {
  const data = await fetchJolpica<RaceTable>(
    `/${year}/${round}/results.json`
  );
  const race = data.MRData.RaceTable.Races[0];
  return race?.Results ?? [];
}

export async function getDrivers(year: number) {
  const data = await fetchJolpica<{
    DriverTable: {
      season: string;
      Drivers: {
        driverId: string;
        permanentNumber: string;
        code: string;
        givenName: string;
        familyName: string;
      }[];
    };
  }>(`/${year}/drivers.json`);
  return data.MRData.DriverTable.Drivers;
}

export async function getConstructors(year: number) {
  const data = await fetchJolpica<{
    ConstructorTable: {
      season: string;
      Constructors: {
        constructorId: string;
        name: string;
        nationality: string;
      }[];
    };
  }>(`/${year}/constructors.json`);
  return data.MRData.ConstructorTable.Constructors;
}
