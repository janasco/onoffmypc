"use client";

import { useEffect } from "react";

/**
 * The old `app.onoffmypc.com` root ran `init.js`, which sent a signed-in user
 * to the dashboard and everyone else to login. The new app is a single static
 * export served on both hosts, so the root must keep that behaviour for the
 * app host without changing the marketing host.
 *
 * `/dashboard` already redirects to `/login` when there is no session, so this
 * only needs to preserve the entry point.
 */
export function HostRedirect({ host, to }: { host: string; to: string }) {
  useEffect(() => {
    if (window.location.hostname === host && window.location.pathname === "/") {
      window.location.replace(to);
    }
  }, [host, to]);

  return null;
}
