"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell } from "@/components/form-shell";

export default function CreateLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Couldn't create the league.");
      return;
    }
    router.push(`/leagues/${data.id}`);
  }

  return (
    <FormShell
      eyebrow="New league"
      title="Create league"
      description="You'll get an invite code to send to the group chat."
      footer={
        <>
          Got a code already?{" "}
          <Link href="/leagues/join" className="text-chalk underline underline-offset-4 hover:text-flag-yellow">
            Join a league
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
          <Label htmlFor="name" className="t-eyebrow">League name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Grid Crew"
            maxLength={50}
            className="h-11 bg-asphalt-900 border-asphalt-600"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create league"}
        </Button>
      </form>
    </FormShell>
  );
}
