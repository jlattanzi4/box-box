"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell } from "@/components/form-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Couldn't create the account.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Account created, but sign-in failed. Try signing in.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <FormShell
      eyebrow="New driver"
      title="Create account"
      description="Your name is what your league sees on the timing tower."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-chalk underline underline-offset-4 hover:text-flag-yellow">
            Sign in
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
          <Label htmlFor="name" className="t-eyebrow">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-asphalt-900 border-asphalt-600"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="t-eyebrow">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-asphalt-900 border-asphalt-600"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="t-eyebrow">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            className="h-11 bg-asphalt-900 border-asphalt-600"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
    </FormShell>
  );
}
