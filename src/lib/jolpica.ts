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
