"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell } from "@/components/form-shell";

export default function JoinLeaguePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "That code didn't work.");
      return;
    }
    router.push(`/leagues/${data.leagueId}`);
  }

  return (
    <FormShell
      eyebrow="Join a league"
      title="Enter the code"
      description="Eight characters, from whoever set up the league."
      footer={
        <>
          Starting your own?{" "}
          <Link href="/leagues/create" className="text-chalk underline underline-offset-4 hover:text-flag-yellow">
            Create a league
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-chalk bg-kerb/15 border border-kerb/40 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="code" className="t-eyebrow">Invite code</Label>
          <Input
            id="code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3D4"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="h-14 bg-asphalt-900 border-asphalt-600 t-num text-2xl text-center tracking-[0.3em] uppercase"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Joining…" : "Join league"}
        </Button>
      </form>
    </FormShell>
  );
}
