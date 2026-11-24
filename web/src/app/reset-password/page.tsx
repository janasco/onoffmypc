"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BrandLockup } from "@/components/brand-lockup";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Recovery token is missing.");
      return;
    }
    if (!password || !confirmPassword) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: apiError } = await api.resetPassword(token, password);
    setLoading(false);

    if (apiError) {
      setError(apiError);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  return (
    <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
      <CardHeader className="gap-2">
        <h1 className="type-section-title text-zinc-50">New password</h1>
        <p className="type-body text-zinc-400">
          Enter and confirm your new account password
        </p>
      </CardHeader>
      <CardContent>
        {!token ? (
          <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-3 text-center type-body-sm text-red-300">
            Recovery token is invalid or missing. The link may have expired.
          </div>
        ) : success ? (
          <div role="status" className="flex flex-col gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3.5 py-3 type-body-sm text-emerald-300">
            <span className="type-label">Password updated successfully</span>
            <span>Redirecting to the login screen…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="type-label text-zinc-300" htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                required
                className={FIELD_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="type-label text-zinc-300" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className={FIELD_CLASS}
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
              {loading ? "Resetting…" : "Reset password"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center border-t border-zinc-800/60 pt-6">
        <Link href="/login" className="type-label text-emerald-400 transition-colors hover:text-emerald-300">
          Return to login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="flex w-full max-w-[22rem] flex-col gap-6">
        <Link href="/" className="flex min-h-11 items-center self-center text-zinc-100 transition-opacity hover:opacity-90">
          <BrandLockup size={22} />
        </Link>

        <Suspense fallback={
          <Card className="w-full bg-zinc-900 ring-1 ring-zinc-800/80">
            <CardHeader className="gap-2">
              <h1 className="type-section-title text-zinc-50">New password</h1>
            </CardHeader>
            <CardContent>
              <p className="py-6 text-center type-body-sm text-zinc-400">Loading parameters…</p>
            </CardContent>
          </Card>
        }>
          <ResetPasswordInner />
        </Suspense>
      </div>
    </div>
  );
}
