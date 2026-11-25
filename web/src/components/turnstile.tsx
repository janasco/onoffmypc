"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const finish = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile did not initialize."));
    };

    if (existing && existing.dataset.loaded === "true") {
      finish();
      return;
    }

    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      finish();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile could not load.")), { once: true });
    if (!existing) document.head.appendChild(script);
  }).catch((err) => {
    scriptPromise = null;
    throw err;
  });

  return scriptPromise;
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  onEnabled: (enabled: boolean) => void;
  resetKey?: number;
};

/**
 * Cloudflare Turnstile widget. The site key is fetched from the API's public
 * auth-status endpoint, so the web bundle does not need a separate build-time
 * secret or an environment-specific site key.
 */
export function TurnstileWidget({ onToken, onEnabled, resetKey = 0 }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(onToken);
  const enabledRef = useRef(onEnabled);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tokenRef.current = onToken;
    enabledRef.current = onEnabled;
  }, [onToken, onEnabled]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;

    setError(null);
    setLoading(true);
    tokenRef.current(null);

    void (async () => {
      try {
        const { data, error: apiError } = await api.registrationStatus<{ turnstile_site_key?: string | null }>();
        const siteKey = data?.turnstile_site_key;
        if (apiError) {
          // Do not fail open: an unavailable status check must not make login
          // look unverified when the server may still require a token.
          enabledRef.current(true);
          setLoading(false);
          setError("Could not check browser verification. Reload and try again.");
          return;
        }
        if (!siteKey) {
          enabledRef.current(false);
          setLoading(false);
          return;
        }

        enabledRef.current(true);
        const turnstile = await loadTurnstile();
        if (cancelled || !container.current) return;

        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          theme: "light",
          // Flexible has a 300px minimum; compact keeps the widget inside the
          // auth card at 320px and 360px viewports.
          size: "compact",
          callback: (token: string) => tokenRef.current(token),
          "expired-callback": () => tokenRef.current(null),
          "error-callback": () => {
            tokenRef.current(null);
            setError("Browser verification failed. Please reload and try again.");
          },
        });
        setLoading(false);
      } catch {
        if (cancelled) return;
        enabledRef.current(true);
        setLoading(false);
        setError("Browser verification could not load. Please reload and try again.");
      }
    })();

    return () => {
      cancelled = true;
      tokenRef.current(null);
      if (widgetId && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* already removed */ }
      }
    };
  }, [resetKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={container} className="flex min-h-16 w-full items-center justify-center" aria-label="Browser verification" />
      {loading && <p className="type-metadata text-muted-foreground">Loading browser verification…</p>}
      {error && <p role="alert" className="type-metadata text-red-700">{error}</p>}
    </div>
  );
}
