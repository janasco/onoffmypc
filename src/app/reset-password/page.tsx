"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";

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

  if (!token) {
    return (
      <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-3 rounded-lg text-center">
        Recovery token is invalid or missing. Link may have expired.
      </div>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 text-xl font-bold">New Password</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter and confirm your new account password
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-sm px-3.5 py-3 rounded-lg flex flex-col gap-2">
            <span className="font-semibold">Password updated successfully!</span>
            <span>Redirecting to the login screen…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-2.5 rounded-lg">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400" htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 mt-2">
              {loading ? "Resetting…" : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center border-t border-zinc-800/60 pt-6">
        <Link href="/login" className="text-sm text-emerald-500 hover:text-emerald-400 font-semibold transition-colors">
          Return to login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity self-center text-zinc-100">
          <span className="text-emerald-500">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v9" />
              <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
            </svg>
          </span>
          OnOffMyPC
        </Link>

        <Suspense fallback={
          <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 font-bold">New Password</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 py-6 text-sm text-center">Loading parameters…</p>
            </CardContent>
          </Card>
        }>
          <VerifyEmailInnerWrapper />
        </Suspense>
      </div>
    </div>
  );
}

// Map VerifyEmailInnerWrapper component to avoid naming conflicts
function VerifyEmailInnerWrapper() {
  return <ResetPasswordInner />;
}
