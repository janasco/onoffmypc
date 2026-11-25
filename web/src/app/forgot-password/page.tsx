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
            <p className="type-overline text-emerald-700">Account recovery</p>
            <h1 className="type-screen-title text-foreground">Reset your password</h1>
            <p className="type-body text-muted-foreground">
              We&apos;ll email you a secure link to choose a new password.
            </p>
          </header>

          {success ? (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 type-body-sm text-emerald-800"
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
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 type-body-sm text-red-700"
                >
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="type-label text-foreground" htmlFor="email">
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

          <p className="border-t border-border pt-6 text-center type-body-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
              Return to sign in
            </Link>
          </p>
        </div>
      </AuthPanel>
    </AuthShell>
  );
}
