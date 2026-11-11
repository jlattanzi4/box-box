import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { liveryByUser, type LiveryPick } from "@/lib/standings";

const NOW = new Date("2026-11-20T12:00:00Z");
const race = (round: number, deadline: string, status = "completed") => ({ round, pickDeadline: new Date(deadline), status });
const pick = (userId: string, constructor: string | null, r: LiveryPick["race"]): LiveryPick => ({
  userId,
  constructorJolpicaId: constructor,
  race: r,
});

const brazil = race(20, "2026-11-08T17:00:00Z");
const vegas = race(21, "2026-11-22T04:00:00Z", "upcoming");   // not locked yet

describe("liveryByUser", () => {
  it("uses each member's most recent locked pick", () => {
    const livery = liveryByUser(
      [pick("ana", "ferrari", race(19, "2026-11-01T20:00:00Z")), pick("ana", "mclaren", brazil), pick("ben", "williams", brazil)],
      NOW
    );
    expect(livery.get("ana")).toBe("mclaren");
    expect(livery.get("ben")).toBe("williams");
  });

  it("does not reveal a pick for a race that hasn't started", () => {
    // Ana has already picked Mercedes for Las Vegas. Until lights out, her
    // stripe must still show Brazil's pick, or the colour gives it away.
    const livery = liveryByUser([pick("ana", "mclaren", brazil), pick("ana", "mercedes", vegas)], NOW);
    expect(livery.get("ana")).toBe("mclaren");
  });

  it("shows the new pick once its deadline has passed", () => {
    const afterLightsOut = new Date("2026-11-22T04:00:01Z");
    const livery = liveryByUser([pick("ana", "mclaren", brazil), pick("ana", "mercedes", vegas)], afterLightsOut);
    expect(livery.get("ana")).toBe("mercedes");
  });

  it("gives no stripe to a member whose only pick is still open, or who picked Race Control last", () => {
    const livery = liveryByUser([pick("cal", "mercedes", vegas), pick("dee", "haas", race(19, "2026-11-01T20:00:00Z")), pick("dee", null, brazil)], NOW);
    expect(livery.has("cal")).toBe(false);
    expect(livery.get("dee")).toBeNull();
  });

  it("ignores picks on cancelled races", () => {
    const cancelled = race(20, "2026-11-08T17:00:00Z", "cancelled");
    const livery = liveryByUser([pick("ana", "ferrari", race(19, "2026-11-01T20:00:00Z")), pick("ana", "mclaren", cancelled)], NOW);
    expect(livery.get("ana")).toBe("ferrari");
  });
});
