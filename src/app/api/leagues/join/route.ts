import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allow, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const joinSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invite codes are short. This stops one account from guessing its way in.
  const verdict = await allow([`join:member:${session.user.id}`], LIMITS.join);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Too many invite codes tried. Try again later." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const { inviteCode } = joinSchema.parse(body);

    const league = await prisma.league.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!league) {
      return NextResponse.json(
        { error: "Invalid invite code." },
        { status: 404 }
      );
    }

    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this league." },
        { status: 409 }
      );
    }

    await prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        userId: session.user.id,
        role: "member",
      },
    });

    return NextResponse.json({ leagueId: league.id, name: league.name });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
