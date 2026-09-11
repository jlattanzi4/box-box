"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell } from "@/components/form-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("That email and password don't match.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <FormShell
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="text-chalk underline underline-offset-4 hover:text-flag-yellow">
            Create an account
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 bg-asphalt-900 border-asphalt-600"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </FormShell>
  );
}
