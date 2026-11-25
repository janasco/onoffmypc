"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthPanel, AuthShell, authFieldClass } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: apiError } = await api.forgotPassword(email);
    setLoading(false);

    if (apiError) {
      setError(apiError);
    } else {
      setSuccess(true);
    }
  };

  return (
    <AuthShell variant="forgot">
      <AuthPanel>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="type-overline text-emerald-400">Account recovery</p>
            <h1 className="type-screen-title text-zinc-50">Reset your password</h1>
            <p className="type-body text-zinc-400">
              We&apos;ll email you a secure link to choose a new password.
            </p>
          </header>

          {success ? (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-4 py-4 type-body-sm text-emerald-300"
            >
              <span className="type-label">Reset link sent</span>
              <span>
                Check your inbox for the newest link. Each new request invalidates
                earlier reset links.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300"
                >
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="type-label text-zinc-300" htmlFor="email">
                  Account email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className={authFieldClass}
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
                {loading ? "Sending link…" : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="border-t border-zinc-800/70 pt-6 text-center type-body-sm text-zinc-400">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
              Return to sign in
            </Link>
          </p>
        </div>
      </AuthPanel>
    </AuthShell>
  );
}
