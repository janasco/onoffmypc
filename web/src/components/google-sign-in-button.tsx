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
  const wrapper = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const initializedCallback = useRef<((response: CredentialResponse) => void) | null>(null);
  const buttonWidthRef = useRef<number | null>(null);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
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

  const renderButton = useCallback((width: number) => {
    const id = window.google?.accounts?.id;
    if (!id || !container.current) return;
    // Re-rendering the GIS button replaces its iframe, so clear it first.
    container.current.innerHTML = "";
    id.renderButton(container.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width,
    });
    setReady(true);
  }, []);

  const initialize = useCallback(() => {
    const id = window.google?.accounts?.id;
    const width = buttonWidthRef.current;
    if (!id || !container.current || width === null) return;
    if (initializedCallback.current !== handleCredential) {
      id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: handleCredential,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      initializedCallback.current = handleCredential;
    }
    renderButton(width);
  }, [handleCredential, renderButton]);

  // Keep the GIS iframe inside the card at narrow viewports. GIS accepts a
  // minimum width of 200px and a maximum of 400px, so cap it at 320px.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const updateWidth = (value: number) => {
      const next = Math.min(320, Math.max(200, Math.round(value)));
      buttonWidthRef.current = next;
      setButtonWidth((current) => (current === next ? current : next));
    };
    updateWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Navigating between /login and /register can keep the script loaded, so the
  // onLoad event may not fire again. Initialize whenever the API is present.
  useEffect(() => {
    if (buttonWidth !== null && window.google?.accounts?.id) initialize();
  }, [buttonWidth, initialize]);

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
    <div ref={wrapper}>
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
        <p className="mt-2 text-center text-xs text-zinc-400">Loading Google sign-in…</p>
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
