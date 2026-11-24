"use client";

import { useEffect } from "react";

const APP_ORIGIN = "https://app.onoffmypc.com";

/**
 * Google Identity Services only accepts the JavaScript origins registered on
 * the OAuth client. The app host is registered; the apex/preview hosts are
 * not. Send sign-in traffic to the app host so the Google button works from
 * marketing links too. The query string is preserved for ?next=.
 */
export function AuthHostRedirect() {
  useEffect(() => {
    const { protocol, hostname, pathname, search, hash } = window.location;
    if (protocol !== "https:") return;
    if (hostname === "app.onoffmypc.com" || hostname === "localhost" || hostname === "127.0.0.1") {
      return;
    }
    const shouldUseAppHost =
      hostname === "onoffmypc.com" ||
      hostname === "www.onoffmypc.com" ||
      hostname.endsWith(".pages.dev");
    if (shouldUseAppHost) {
      window.location.replace(`${APP_ORIGIN}${pathname}${search}${hash}`);
    }
  }, []);

  return null;
}
