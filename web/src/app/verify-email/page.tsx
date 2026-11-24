"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BrandLockup } from "@/components/brand-lockup";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // A missing token is a render-time concern, so it is derived rather than
  // written into state from an effect (which would cause a cascading render).
  const missingToken = !token;
  const verifyingNow = !missingToken && verifying;
  const successNow = !missingToken && success;
  const error = apiError ?? (missingToken ? "Verification token is missing." : null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      const { error: err } = await api.verifyEmail(token);
      if (cancelled) return;
      setVerifying(false);
      if (err) setApiError(err);
      else setSuccess(true);
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <Card className="w-full bg-zinc-900 ring-1 ring-zinc-800/80">
      <CardHeader className="gap-2">
        <h1 className="type-section-title text-zinc-50">Email verification</h1>
        <p className="type-body text-zinc-400">
          Confirming your email address registration
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        {verifyingNow ? (
          <p className="py-6 type-body-sm text-zinc-400">Verifying your email address, please wait…</p>
        ) : successNow ? (
          <div className="flex flex-col gap-4 py-4">
            <span aria-hidden="true" className="text-5xl text-emerald-400">✓</span>
            <p className="type-body text-zinc-300">Your email address has been successfully verified. You can now use all dashboard fleet actions.</p>
            <Link href="/dashboard" className="mt-2 block w-full">
              <Button className="h-11 w-full">
                Go to dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <span aria-hidden="true" className="text-5xl text-red-400">✕</span>
            <p role="alert" className="type-label text-red-300">{error || "Verification failed"}</p>
            <p className="type-body-sm text-zinc-400">The link may have expired or is invalid. Request a new verification link from your account page.</p>
            <Link href="/login" className="mt-2 block w-full">
              <Button variant="outline" className="h-11 w-full border-zinc-700 text-zinc-300 hover:bg-zinc-950">
                Return to login
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="flex w-full max-w-[22rem] flex-col gap-6">
        <Link href="/" className="flex min-h-11 items-center self-center text-zinc-100 transition-opacity hover:opacity-90">
          <BrandLockup size={22} />
        </Link>

        <Suspense fallback={
          <Card className="w-full bg-zinc-900 ring-1 ring-zinc-800/80">
            <CardHeader className="gap-2">
              <h1 className="type-section-title text-zinc-50">Email verification</h1>
            </CardHeader>
            <CardContent>
              <p className="py-6 text-center type-body-sm text-zinc-400">Loading parameters…</p>
            </CardContent>
          </Card>
        }>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
