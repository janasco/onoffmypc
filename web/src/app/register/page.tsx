"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { BrandLockup } from "@/components/brand-lockup";
import { AuthHostRedirect } from "@/components/auth-host-redirect";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Only relative paths, so ?next= cannot become an open redirect.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("next");
    // The query string is client-only; reading it in an effect avoids a
    // hydration mismatch on the statically exported page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value && value.startsWith("/") && !value.startsWith("//")) setNextPath(value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.register(email, password, inviteCode || undefined);
    setLoading(false);

    if (apiError) {
      setError(apiError);
    } else if (data) {
      router.push(nextPath ?? "/dashboard");
    }
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <AuthHostRedirect />
      <div className="flex w-full max-w-[22rem] flex-col gap-6">
        <Link href="/" className="flex min-h-11 items-center self-center text-zinc-100 transition-opacity hover:opacity-90">
          <BrandLockup size={22} />
        </Link>

        <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
          <CardHeader className="gap-2">
            <h1 className="type-section-title text-zinc-50">Create an account</h1>
            <p className="type-body text-zinc-400">
              Get started with remote power control free
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="type-label text-zinc-300" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className={FIELD_CLASS}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-label text-zinc-300" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className={FIELD_CLASS}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-label text-zinc-300" htmlFor="inviteCode">Invite code (optional)</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite code"
                  autoComplete="off"
                  className={FIELD_CLASS}
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <div className="relative my-6 text-center">
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-zinc-800"></span>
              <span className="relative bg-zinc-900 px-3 type-label text-zinc-400">or</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <GoogleSignInButton nextPath={nextPath} />
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-zinc-800/60 bg-zinc-900/40 pt-6">
            <p className="type-body-sm text-zinc-400">
              Already have an account?{" "}
              <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"} className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
