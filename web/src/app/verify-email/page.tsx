"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
        <p className="type-overline text-emerald-700">Signal / 05</p>
        <h1 className="type-screen-title text-foreground">Email verification</h1>
        <p className="type-body text-muted-foreground">
          Confirming the address associated with your account.
        </p>
      </header>

      <div className="flex flex-col gap-4 py-2 text-center">
        {resolvingToken ? (
          <p className="py-6 type-body-sm text-muted-foreground">Loading verification link…</p>
        ) : verifyingNow ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-6">
            <span
              aria-hidden="true"
              className="h-14 w-14 animate-pulse rounded-full border-2 border-primary/30 bg-primary/10"
            />
            <p className="type-body-sm text-muted-foreground">Verifying your email address…</p>
          </div>
        ) : successNow ? (
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-6"
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-semibold text-white"
            >
              ✓
            </span>
            <div className="flex flex-col gap-1">
              <p className="type-body-sm text-emerald-800">
                Your email address has been successfully verified. You can now use all
                dashboard fleet actions.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="type-label mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground transition-colors hover:bg-emerald-800"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-6"
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl font-semibold text-white"
            >
              ✕
            </span>
            <p className="type-label text-red-800">
              {error || "Verification failed"}
            </p>
            <p className="type-body-sm text-red-700">
              The link may have expired or is invalid. Request a new verification
              link from your account page.
            </p>
            <Link
              href="/login"
              className="type-label mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card px-4 text-foreground transition-colors hover:bg-muted"
            >
              Return to login
            </Link>
          </div>
        )}
      </div>

      <p className="border-t border-border pt-6 text-center type-body-sm text-muted-foreground">
        Need help?{" "}
        <Link href="/contact" className="inline-flex min-h-11 items-center font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
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
        <Suspense fallback={<p className="py-8 text-center type-body-sm text-muted-foreground">Loading verification link…</p>}>
          <VerifyEmailInner />
        </Suspense>
      </AuthPanel>
    </AuthShell>
  );
}
