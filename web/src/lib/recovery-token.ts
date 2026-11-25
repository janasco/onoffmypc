/**
 * Recovery links deliberately put the token in the URL fragment so it is not
 * sent to the server in the request line or referrer. The fragment is either
 * `#token=<value>` (current links) or `#<value>` for compatibility, while old
 * query-string links remain supported by the page.
 */
export function recoveryTokenFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;

  // Current links are `#token=v2_...`, but accepting a bare token also handles
  // links produced by earlier clients and avoids a second broken-link class.
  if (raw.startsWith("v2_")) return raw.trim() || null;

  const params = new URLSearchParams(raw);
  const token = params.get("token") ?? params.get("t");
  const trimmed = token?.trim();
  return trimmed || null;
}
