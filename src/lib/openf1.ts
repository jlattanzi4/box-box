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

interface OpenF1RaceControl {
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

export interface ParsedRaceEvents {
  redFlags: number;
  safetyCars: number;
  vscs: number;
  dnfs: number;
  wet: boolean;
  penalties: number;
  details: { eventType: string; description: string }[];
}

export function parseRaceControlEvents(events: OpenF1RaceControl[]): ParsedRaceEvents {
  let redFlags = 0;
  let safetyCars = 0;
  let vscs = 0;
  let wet = false;
  let penalties = 0;
  const details: { eventType: string; description: string }[] = [];

  for (const event of events) {
    const msg = event.message.toUpperCase();

    if (msg.includes("RED FLAG")) {
      redFlags++;
      details.push({ eventType: "red_flag", description: event.message });
    } else if (msg.includes("VIRTUAL SAFETY CAR") || msg.includes("VSC")) {
      // Only count VSC deployments, not endings
      if (msg.includes("DEPLOYED") || msg.includes("VSC DEPLOYED") || (!msg.includes("ENDING") && !msg.includes("ENDED"))) {
        vscs++;
        details.push({ eventType: "vsc", description: event.message });
      }
    } else if (msg.includes("SAFETY CAR") && !msg.includes("VIRTUAL")) {
      // Only count SC deployments, not endings
      if (msg.includes("DEPLOYED") || msg.includes("IN THIS LAP") || (!msg.includes("ENDING") && !msg.includes("ENDED") && !msg.includes("IN"))) {
        safetyCars++;
        details.push({ eventType: "safety_car", description: event.message });
      }
    }

    if (msg.includes("WET RACE") || msg.includes("WET DECLARED")) {
      wet = true;
      details.push({ eventType: "wet", description: event.message });
    }

    if (msg.includes("PENALTY") && (msg.includes("TIME") || msg.includes("GRID") || msg.includes("SECOND"))) {
      penalties++;
      details.push({ eventType: "penalty", description: event.message });
    }

    if (msg.includes("RETIRED") || msg.includes("STOPPED")) {
      details.push({ eventType: "dnf", description: event.message });
    }
  }

  return { redFlags, safetyCars, vscs, dnfs: details.filter(d => d.eventType === "dnf").length, wet, penalties, details };
}

export async function getSessionKeyForRound(year: number, round: number): Promise<number | null> {
  const sessions = await getRaceSessions(year);
  // Sessions are returned in date order; the round-th Race session corresponds to our round
  // We match by index since OpenF1 doesn't use "round" directly
  const raceSessions = sessions.sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const session = raceSessions[round - 1];
  return session?.session_key ?? null;
}
