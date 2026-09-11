import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StartLights } from "@/components/start-lights";

// The headline arrives the instant the lights go out (see start-lights.tsx).
const AFTER_LIGHTS = "2.85s";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-16 sm:gap-24 py-6 sm:py-12">
      <section className="flex flex-col items-center text-center gap-8">
        <StartLights />

        <div className="space-y-5">
          <h1
            className="t-display text-[5.5rem] sm:text-[9rem] text-chalk fade-up"
            style={{ animationDelay: AFTER_LIGHTS }}
          >
            Box{" "}
            <span className="text-kerb">Box</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-chalk-dim max-w-md mx-auto fade-up"
            style={{ animationDelay: "3s" }}
          >
            Fantasy F1 for your group chat. One pick a race. Every driver once.
            Scored from the real results.
          </p>
        </div>

        <div className="flex gap-3 fade-up" style={{ animationDelay: "3.1s" }}>
          <Button asChild size="lg">
            <Link href="/register">Start a league</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-2xl w-full mx-auto fade-up" style={{ animationDelay: "3.2s" }}>
        <p className="t-eyebrow mb-3">The whole rulebook</p>
        <div className="pit-board">
          <div className="kerb" />
          <div className="pit-board-row">
            <span className="text-chalk-dim">Drivers</span>
            <span className="pit-board-value text-3xl sm:text-4xl">22 · once each</span>
          </div>
          <div className="pit-board-row">
            <span className="text-chalk-dim">Constructors</span>
            <span className="pit-board-value text-3xl sm:text-4xl">11 · twice each</span>
          </div>
          <div className="pit-board-row">
            <span className="text-chalk-dim">Race Control</span>
            <span className="pit-board-value text-3xl sm:text-4xl">2 · bet on chaos</span>
          </div>
          <div className="pit-board-row">
            <span className="text-chalk-dim">Picks lock</span>
            <span className="pit-board-value text-3xl sm:text-4xl">at lights out</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-chalk-dim">
          Your driver scores their real championship points. Your constructor scores both of
          its cars. Race Control scores safety cars, red flags, rain and retirements.{" "}
          <Link href="/how-it-works" className="text-chalk underline underline-offset-4 hover:text-flag-yellow">
            Full scoring
          </Link>
        </p>
      </section>
    </div>
  );
}
