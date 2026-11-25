"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthPanel, AuthShell } from "@/components/auth-shell";
import { recoveryTokenFromHash } from "@/lib/recovery-token";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token");
  const [token, setToken] = useState<string | null>(queryToken);
  const [resolvingToken, setResolvingToken] = useState(!queryToken);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
      setResolvingToken(false);
      return;
    }
    const fromHash = recoveryTokenFromHash(window.location.hash);
    if (fromHash) {
      setToken(fromHash);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setResolvingToken(false);
  }, [queryToken]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const missingToken = !resolvingToken && !token;
  const verifyingNow = !resolvingToken && !missingToken && verifying;
  const successNow = !resolvingToken && !missingToken && success;
  const error = apiError ?? (missingToken ? "Verification token is missing." : null);

  useEffect(() => {
    if (!token || resolvingToken) return;

    let cancelled = false;
    void (async () => {
      const { error: err } = await api.verifyEmail(token);
      if (cancelled) return;
      setVerifying(false);
      if (err) setApiError(err);
      else setSuccess(true);
    })();
    return () => { cancelled = true; };
  }, [token, resolvingToken]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-overline text-emerald-400">Signal / 05</p>
        <h1 className="type-screen-title text-zinc-50">Email verification</h1>
        <p className="type-body text-zinc-400">
          Confirming the address associated with your account.
        </p>
      </header>

      <div className="flex flex-col gap-4 py-2 text-center">
        {resolvingToken ? (
          <p className="py-6 type-body-sm text-zinc-400">Loading verification link…</p>
        ) : verifyingNow ? (
          <p className="py-6 type-body-sm text-zinc-400">Verifying your email address…</p>
        ) : successNow ? (
          <div className="flex flex-col gap-4">
            <span aria-hidden="true" className="text-5xl text-emerald-400">✓</span>
            <p className="type-body text-zinc-300">
              Your email address has been successfully verified. You can now use all
              dashboard fleet actions.
            </p>
            <Link href="/dashboard" className="mt-2 block w-full">
              <Button className="h-11 w-full">Go to dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <span aria-hidden="true" className="text-5xl text-red-400">✕</span>
            <p role="alert" className="type-label text-red-300">
              {error || "Verification failed"}
            </p>
            <p className="type-body-sm text-zinc-400">
              The link may have expired or is invalid. Request a new verification
              link from your account page.
            </p>
            <Link href="/login" className="mt-2 block w-full">
              <Button variant="outline" className="h-11 w-full border-zinc-700 text-zinc-300 hover:bg-zinc-950">
                Return to login
              </Button>
            </Link>
          </div>
        )}
      </div>

      <p className="border-t border-zinc-800/70 pt-6 text-center type-body-sm text-zinc-400">
        Need help?{" "}
        <Link href="/contact" className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
          Contact support
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell variant="verify">
      <AuthPanel>
        <Suspense fallback={<p className="py-8 text-center type-body-sm text-zinc-400">Loading verification link…</p>}>
          <VerifyEmailInner />
        </Suspense>
      </AuthPanel>
    </AuthShell>
  );
}
