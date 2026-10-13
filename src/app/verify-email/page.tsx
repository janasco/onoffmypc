"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

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
    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-zinc-100 font-bold">Email Verification</CardTitle>
        <CardDescription className="text-zinc-400">
          Confirming your email address registration
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        {verifyingNow ? (
          <p className="text-zinc-400 py-6 text-sm">Verifying your email address, please wait…</p>
        ) : successNow ? (
          <div className="flex flex-col gap-4 py-4">
            <span className="text-emerald-500 text-5xl">✓</span>
            <p className="text-zinc-300 text-sm">Your email address has been successfully verified! You can now use all dashboard fleet actions.</p>
            <Link href="/dashboard" className="w-full mt-2">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <span className="text-red-500 text-5xl">✕</span>
            <p className="text-red-400 text-sm font-semibold">{error || "Verification failed"}</p>
            <p className="text-zinc-400 text-xs">The link may have expired or is invalid. Request a new verification link from your account page.</p>
            <Link href="/login" className="w-full mt-2">
              <Button variant="outline" className="w-full border-zinc-850 text-zinc-300 hover:bg-zinc-950">
                Return to Login
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
              <CardTitle className="text-zinc-100 font-bold">Email Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 py-6 text-sm text-center">Loading parameters…</p>
            </CardContent>
          </Card>
        }>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
