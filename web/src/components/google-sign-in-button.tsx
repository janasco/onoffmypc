"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/google";

type CredentialResponse = { credential?: string; select_by?: string };

type GoogleAccountsId = {
  initialize(options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  cancel(): void;
  disableAutoSelect(): void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

/**
 * Google Identity Services button. It obtains a Google ID token in the browser
 * and exchanges it for the normal HttpOnly session cookie via POST /auth/google.
 * No token is stored in localStorage.
 */
export function GoogleSignInButton({ nextPath }: { nextPath?: string | null }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      if (!response.credential) return;
      setBusy(true);
      setError(null);
      const { data, error: apiError } = await api.googleAuth<{ is_new?: boolean }>(
        response.credential,
      );
      setBusy(false);
      if (apiError) {
        setError(
          apiError === "unauthorized"
            ? "Google sign-in was rejected. Please try again."
            : apiError,
        );
        return;
      }
      if (data) router.push(nextPath ?? "/dashboard");
    },
    [nextPath, router],
  );

  const initialize = useCallback(() => {
    const id = window.google?.accounts?.id;
    if (!id || !container.current) return;
    id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: handleCredential,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    // Re-render safely if both the script onLoad and the effect fire.
    container.current.innerHTML = "";
    id.renderButton(container.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
    });
    setReady(true);
  }, [handleCredential]);

  // Navigating between /login and /register can keep the script loaded, so the
  // onLoad event may not fire again. Initialize whenever the API is present.
  useEffect(() => {
    if (window.google?.accounts?.id) initialize();
  }, [initialize]);

  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => {
      if (!ready) {
        setError(
          "Google sign-in did not initialize. This site may be missing from the OAuth client's authorized JavaScript origins.",
        );
      }
    }, 12_000);
    return () => clearTimeout(timer);
  }, [ready, error]);

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initialize}
        onError={() =>
          setError("Google sign-in could not load. Check your connection or use email.")
        }
      />
      <div
        ref={container}
        className="flex min-h-10 w-full items-center justify-center"
        aria-busy={busy}
      />
      {!ready && !error && (
        <p className="mt-2 text-center text-xs text-zinc-500">Loading Google sign-in…</p>
      )}
      {busy && <p className="mt-2 text-center text-xs text-zinc-400">Signing in…</p>}
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
