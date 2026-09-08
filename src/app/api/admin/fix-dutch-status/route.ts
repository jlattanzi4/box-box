import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SEASON_YEAR } from "@/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const race = await prisma.race.findFirst({
    where: { seasonYear: SEASON_YEAR, country: { contains: "Netherlands", mode: "insensitive" } },
  });
  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const updated = await prisma.race.update({
    where: { id: race.id },
    data: { status: "completed" },
  });

  return NextResponse.json({
    message: `Updated ${updated.name} status from cancelled to completed`,
    race: updated,
  });
}
