// OpenF1 API client — race control events
// Docs: https://openf1.org/
// Rate limit: 3 req/s, 30/min

const BASE_URL = "https://api.openf1.org/v1";

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  year: number;
  country_name: string;
  circuit_short_name: string;
  meeting_key: number;
}

export interface OpenF1RaceControl {
  date: string;
  category: string;
  flag?: string;
  message: string;
  scope?: string;
  driver_number?: number;
  lap_number?: number;
  sector?: number;
}

async function fetchOpenF1<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`OpenF1 API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getRaceSessions(year: number) {
  return fetchOpenF1<OpenF1Session>("/sessions", {
    year: year.toString(),
    session_type: "Race",
  });
}

export async function getRaceControlEvents(sessionKey: number) {
  return fetchOpenF1<OpenF1RaceControl>("/race_control", {
    session_key: sessionKey.toString(),
  });
}

/**
 * Finds the OpenF1 session key for a race by matching date proximity.
 * The old approach (array index by round number) broke when races were
 * cancelled or when sprint races added extra sessions to the list.
 * This matches the session whose start time is closest to raceDate,
 * within a 12-hour tolerance so sprint races the day before don't match.
 */
export async function getSessionKeyForRound(year: number, raceDate: Date): Promise<number | null> {
  const sessions = await getRaceSessions(year);
  const raceDateMs = raceDate.getTime();
  const TOLERANCE_MS = 12 * 60 * 60 * 1000; // 12 hours

  let bestMatch: OpenF1Session | null = null;
  let bestDiff = Infinity;

  for (const session of sessions) {
    const diff = Math.abs(new Date(session.date_start).getTime() - raceDateMs);
    if (diff < TOLERANCE_MS && diff < bestDiff) {
      bestMatch = session;
      bestDiff = diff;
    }
  }

  return bestMatch?.session_key ?? null;
}
