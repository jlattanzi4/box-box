import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { tallyUsage, type UsagePick } from "@/lib/constraints";

const pick = (pickType: string, driverId: string | null, constructorId: string | null, status = "completed"): UsagePick => ({
  pickType,
  driverId,
  constructorId,
  race: { status },
});

describe("tallyUsage", () => {
  it("counts drivers, constructor uses and Race Control picks", () => {
    const usage = tallyUsage([
      pick("driver_constructor", "nor", "mclaren"),
      pick("driver_constructor", "ver", "mclaren", "upcoming"),
      pick("race_control", null, null),
    ]);
    expect(usage).toEqual({ usedDriverIds: ["nor", "ver"], usedConstructorCounts: { mclaren: 2 }, raceControlCount: 1 });
  });

  it("does not count a pick on a cancelled race", () => {
    // The race never ran and the pick scored nothing; it shouldn't cost a
    // one-shot driver, a constructor use or a Race Control pick.
    const usage = tallyUsage([
      pick("driver_constructor", "nor", "mclaren", "cancelled"),
      pick("race_control", null, null, "cancelled"),
      pick("driver_constructor", "lec", "ferrari"),
    ]);
    expect(usage).toEqual({ usedDriverIds: ["lec"], usedConstructorCounts: { ferrari: 1 }, raceControlCount: 0 });
  });
});
