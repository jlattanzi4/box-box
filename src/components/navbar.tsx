"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/form-shell";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-asphalt-900/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href={session?.user ? "/dashboard" : "/"} aria-label="Box Box home">
          <Logo compact />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/how-it-works">Rules</Link>
          </Button>
          {session?.user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Leagues</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
      <div className="kerb-thin" />
    </header>
  );
}
