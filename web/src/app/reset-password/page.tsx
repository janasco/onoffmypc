"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthPanel, AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { recoveryTokenFromHash } from "@/lib/recovery-token";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token");
  const [token, setToken] = useState<string | null>(queryToken);
  const [resolvingToken, setResolvingToken] = useState(!queryToken);

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

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Recovery token is missing.");
      return;
    }
    if (!password || !confirmPassword) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: apiError } = await api.resetPassword(token, password);
    setLoading(false);

    if (apiError) {
      setError(apiError);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-overline text-emerald-700">Key change / 04</p>
        <h1 className="type-screen-title text-[#121612]">Choose a new password</h1>
        <p className="type-body text-[#5C675E]">
          Use at least 8 characters. This will sign out other active sessions.
        </p>
      </header>

      {resolvingToken ? (
        <p className="py-6 text-center type-body-sm text-[#5C675E]">Loading recovery link…</p>
      ) : !token ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-center type-body-sm text-red-700"
        >
          Recovery token is invalid or missing. Request a new reset link.
        </div>
      ) : success ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 type-body-sm text-emerald-800"
        >
          <span className="type-label">Password updated successfully</span>
          <span>Redirecting to the login screen…</span>
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
            <label className="type-label text-[#3A463E]" htmlFor="password">
              New password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              tone="light"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-label text-[#3A463E]" htmlFor="confirmPassword">
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              tone="light"
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
            {loading ? "Updating password…" : "Update password"}
          </Button>
        </form>
      )}

      <p className="border-t border-[#D5DBD0] pt-6 text-center type-body-sm text-[#5C675E]">
        <Link href="/login" className="font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
          Return to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell variant="reset">
      <AuthPanel tone="light">
        <Suspense fallback={<p className="py-8 text-center type-body-sm text-[#5C675E]">Loading recovery link…</p>}>
          <ResetPasswordInner />
        </Suspense>
      </AuthPanel>
    </AuthShell>
  );
}
