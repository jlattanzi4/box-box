"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-[0_0_15px_-3px_var(--f1-red)] transition-shadow duration-300">
            <span className="text-xs font-black text-primary-foreground tracking-tight">
              BB
            </span>
          </div>
          <span className="text-lg font-black tracking-tight">
            Box <span className="text-primary">Box</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/how-it-works">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              How It Works
            </Button>
          </Link>
          {session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {session.user.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-border/50"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {/* Subtle gradient glow line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </nav>
  );
}
