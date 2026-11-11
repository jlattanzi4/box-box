import { prisma } from "@/lib/prisma";

/**
 * Attempt limits for sign-in, registration and league joins.
 *
 * The counters live in the database because the app runs as serverless
 * functions that share no memory. Each counter is one row, updated by a single
 * statement, so attempts arriving at the same moment are all counted.
 */

export interface Rule {
  limit: number;
  windowMs: number;
}

export const LIMITS = {
  /** Sign-in attempts, per email and per address. */
  login: { limit: 10, windowMs: 15 * 60_000 },
  /** New accounts, per address. */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** Invite codes tried, per member. */
  join: { limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, Rule>;

export type Query = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

export interface Verdict {
  allowed: boolean;
  /** How long until the window ends; 0 when allowed. */
  retryAfterSeconds: number;
}

// Start a window on the first attempt; count within it; start over once it has ended.
const HIT = `
  INSERT INTO "RateLimit" ("key", "count", "resetAt")
  VALUES ($1, 1, $3::timestamp)
  ON CONFLICT ("key") DO UPDATE SET
    "count"   = CASE WHEN "RateLimit"."resetAt" <= $2::timestamp THEN 1 ELSE "RateLimit"."count" + 1 END,
    "resetAt" = CASE WHEN "RateLimit"."resetAt" <= $2::timestamp THEN $3::timestamp ELSE "RateLimit"."resetAt" END
  RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("resetAt" - $2::timestamp)))::int AS "retryAfter"`;

/** Count one attempt against `key` and say whether it is within the rule. */
export async function hit(query: Query, key: string, rule: Rule, now: Date = new Date()): Promise<Verdict> {
  const windowEnds = new Date(now.getTime() + rule.windowMs);
  const [row] = await query(HIT, [key, now.toISOString(), windowEnds.toISOString()]);
  const allowed = Number(row.count) <= rule.limit;
  return { allowed, retryAfterSeconds: allowed ? 0 : Number(row.retryAfter) };
}

const database: Query = (sql, params) => prisma.$queryRawUnsafe(sql, ...params);

/**
 * Count one attempt against every key and refuse if any is over the limit.
 *
 * If the limiter itself fails, the attempt is allowed and the error logged: a
 * broken counter must not lock everyone out of signing in.
 */
export async function allow(keys: string[], rule: Rule, now: Date = new Date(), query: Query = database): Promise<Verdict> {
  try {
    const verdicts = await Promise.all(keys.map((key) => hit(query, key, rule, now)));
    const refused = verdicts.filter((v) => !v.allowed);
    if (refused.length === 0) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: Math.max(...refused.map((v) => v.retryAfterSeconds)) };
  } catch (error) {
    console.error("Rate limiter failed; allowing the request:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** The caller's address as the host reports it, for per-address limits. */
export function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
