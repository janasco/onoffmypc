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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      setError("Complete the browser verification before creating an account.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.register(
      email,
      password,
      inviteCode || undefined,
      turnstileToken ?? undefined,
    );
    setLoading(false);

    if (apiError) {
      setError(apiError);
      // Turnstile tokens are single-use; refresh after any rejected attempt.
      setTurnstileToken(null);
      setTurnstileReset((current) => current + 1);
    } else if (data) {
      router.push(nextPath ?? "/dashboard");
    }
  };

  return (
    <AuthShell variant="register">
      <AuthHostRedirect />
      <AuthPanel>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="type-overline text-emerald-700">Get started</p>
            <h1 className="type-screen-title text-foreground">Create your account</h1>
            <p className="type-body text-muted-foreground">
              Start managing remote power and device health from one calm workspace.
            </p>
          </header>

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
              <label className="type-label text-foreground" htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="type-label text-foreground" htmlFor="inviteCode">
                Invite code <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Only needed for invite-only registration"
                autoComplete="off"
                className={authFieldClass}
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
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="relative text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-border" />
            <span className="relative bg-card px-3 type-label text-muted-foreground">or</span>
          </div>

          <GoogleSignInButton nextPath={nextPath} />

          <p className="border-t border-border pt-6 text-center type-body-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
              className="inline-flex min-h-11 items-center font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              Sign in
            </Link>
          </p>
        </div>
      </AuthPanel>
    </AuthShell>
  );
}
