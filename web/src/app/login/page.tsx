"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AuthHostRedirect } from "@/components/auth-host-redirect";
import { AuthPanel, AuthShell, authFieldClass } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { TurnstileWidget } from "@/components/turnstile";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRequired, setTurnstileRequired] = useState(true);
  const [turnstileReset, setTurnstileReset] = useState(0);

  // Only relative paths, so ?next= cannot become an open redirect.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("next");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value && value.startsWith("/") && !value.startsWith("//")) setNextPath(value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (turnstileRequired && !turnstileToken) {
      setError("Complete the browser verification before signing in.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.login(
      email,
      password,
      turnstileToken ?? undefined,
    );
    setLoading(false);

    if (apiError) {
      setError(apiError === "unauthorized" ? "Invalid email or password." : apiError);
      // Turnstile tokens are single-use; refresh after any rejected attempt.
      setTurnstileToken(null);
      setTurnstileReset((current) => current + 1);
    } else if (data) {
      router.push(nextPath ?? "/dashboard");
    }
  };

  return (
    <AuthShell>
      <AuthHostRedirect />
      <AuthPanel>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="type-overline text-emerald-400">Account access</p>
            <h1 className="type-screen-title text-zinc-50">Welcome back</h1>
            <p className="type-body text-zinc-400">
              Sign in to manage your fleet, commands, and remote power controls.
            </p>
          </header>

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
                Email
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="type-label text-zinc-300" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="inline-flex min-h-11 items-center type-label text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            </div>

            <TurnstileWidget
              onToken={setTurnstileToken}
              onEnabled={setTurnstileRequired}
              resetKey={turnstileReset}
            />

            <Button
              type="submit"
              disabled={loading || (turnstileRequired && !turnstileToken)}
              className="mt-2 h-11 w-full"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-zinc-800" />
            <span className="relative bg-zinc-900 px-3 type-label text-zinc-400">or</span>
          </div>

          <GoogleSignInButton nextPath={nextPath} />

          <p className="border-t border-zinc-800/70 pt-6 text-center type-body-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"}
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Create an account
            </Link>
          </p>
        </div>
      </AuthPanel>
    </AuthShell>
  );
}
