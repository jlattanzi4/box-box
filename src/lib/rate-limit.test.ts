import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { allow, hit, type Query } from "@/lib/rate-limit";

// A real Postgres, in process. Every migration is applied in order first, so
// this also checks that the migrations run cleanly on top of each other.
let query: Query;
beforeAll(async () => {
  const db = new PGlite();
  const dir = join(process.cwd(), "prisma/migrations");
  for (const name of readdirSync(dir).filter((n) => /^\d/.test(n)).sort()) {
    await db.exec(readFileSync(join(dir, name, "migration.sql"), "utf8"));
  }
  query = async (sql, params) => (await db.query(sql, params)).rows as Record<string, unknown>[];
});

const RULE = { limit: 3, windowMs: 60_000 };
const T0 = new Date("2026-11-11T12:00:00.000Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

describe("hit", () => {
  it("allows attempts up to the limit, then refuses until the window ends", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit(query, "t:window", RULE, at(i)));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    // The window started with the first attempt, so at second 4 there are 56 left.
    expect(results[4].retryAfterSeconds).toBe(56);
  });

  it("starts a fresh window once the old one has ended", async () => {
    for (let i = 0; i < 4; i++) await hit(query, "t:reset", RULE, at(i));
    expect((await hit(query, "t:reset", RULE, at(59))).allowed).toBe(false);
    expect((await hit(query, "t:reset", RULE, at(61))).allowed).toBe(true);
    expect((await hit(query, "t:reset", RULE, at(62))).allowed).toBe(true);
  });

  it("counts each key on its own", async () => {
    for (let i = 0; i < 4; i++) await hit(query, "t:a", RULE, at(i));
    expect((await hit(query, "t:b", RULE, at(5))).allowed).toBe(true);
  });

  it("counts every attempt when many arrive at once", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => hit(query, "t:burst", RULE, at(0))));
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });
});

describe("allow", () => {
  it("applies every key and refuses if any one is over its limit", async () => {
    for (let i = 0; i < 3; i++) await allow(["t:email", "t:ip-1"], RULE, at(i), query);
    // A fourth attempt on the same email from a new address is still refused.
    expect((await allow(["t:email", "t:ip-2"], RULE, at(4), query)).allowed).toBe(false);
  });

  it("lets the request through if the limiter itself fails", async () => {
    // For example the table doesn't exist yet. Signing in must not depend on it.
    const broken: Query = async () => { throw new Error('relation "RateLimit" does not exist'); };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await allow(["t:any"], RULE, T0, broken)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
