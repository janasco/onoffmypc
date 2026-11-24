"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BrandLockup } from "@/components/brand-lockup";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="flex w-full max-w-[22rem] flex-col gap-6">
        <Link href="/" className="flex min-h-11 items-center self-center text-zinc-100 transition-opacity hover:opacity-90">
          <BrandLockup size={22} />
        </Link>

        <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
          <CardHeader className="gap-2">
            <h1 className="type-section-title text-zinc-50">Reset password</h1>
            <p className="type-body text-zinc-400">
              Request a secure recovery link for your account
            </p>
          </CardHeader>
          <CardContent>
            {success ? (
              <div role="status" className="flex flex-col gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3.5 py-3 type-body-sm text-emerald-300">
                <span className="type-label">Reset link sent</span>
                <span>Check your email inbox for instructions to set your new password.</span>
              </div>
            ) : (
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
                <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
                  {loading ? "Sending link…" : "Send reset link"}
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
      </div>
    </div>
  );
}
