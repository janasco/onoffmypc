# Deploying the web app

The web app is a **fully static Next.js export** deployed to **Cloudflare
Pages**. Every route builds as prerendered HTML; there is no server runtime,
no Next.js server, and no edge function. The browser talks to the API at
`api.onoffmypc.com` directly.

There is no CI/CD: deploying is a local command.

## Target

| | |
|---|---|
| Pages project | `onoffmypc-web` |
| Production branch | `main` |
| Domains | `onoffmypc.com`, `www.onoffmypc.com` (www 301s to the apex), `app.onoffmypc.com` |
| Build output | `out/` (from `output: "export"` in `next.config.ts`) |

`app.onoffmypc.com` is served by this same project. Its home page redirects to
`/dashboard`, which sends a signed-out visitor to `/login` — the same entry
behaviour the old `onoffmypc-dashboard` project had. Legacy `.html` paths still
resolve (Pages 308s them to the clean URL). `admin.onoffmypc.com` remains a
separate, Access-gated project (`onoffmypc-admin`).

The old `onoffmypc-dashboard` project was deleted on 2026-11-10. Do not create
another project for `app.`; it is a custom domain on `onoffmypc-web`.

## Credentials

```bash
export CLOUDFLARE_API_TOKEN=...    # Pages: Edit
export CLOUDFLARE_ACCOUNT_ID=...
```

## Deploy

Preview first — this uploads a build to `<hash>.onoffmypc-web.pages.dev` and
leaves production untouched:

```bash
npm run deploy:preview
```

Check the preview URL it prints, then promote:

```bash
npm run deploy
```

Both run `next build` first, so a broken build cannot be deployed.

## Verify

```bash
curl -sI https://onoffmypc.com/downloads
curl -s https://onoffmypc.com/downloads | grep -o 'https://releases.onoffmypc.com[^"]*'
curl -s -o /dev/null -w '%{http_code}\n' https://onoffmypc.com/does-not-exist   # expect 404
```

## Rollback

Every deployment is retained. Roll back from the dashboard
(**Workers & Pages → onoffmypc-web → Deployments → ⋯ → Rollback**) or deploy a
previous commit with `npm run deploy`.

## Notes

- **Don't add dynamic rendering without changing the host.** `output: "export"`
  fails the build if a route needs a server. If that day comes, migrate to
  `@opennextjs/cloudflare` on Workers instead of Pages.
- **`next start` is gone** — it cannot serve a static export. Use `npm run dev`
  locally or a preview deployment.
- **Routes are `page.html`, not `page/index.html`.** Cloudflare Pages' pretty
  URLs map `/downloads` to `downloads.html`; `/downloads/` returns a 308 to the
  canonical form.
- **The API must allow the origin.** `app/src/middleware/csrf.ts` and the CORS
  middleware list `https://onoffmypc.com`, `https://www.onoffmypc.com`,
  `https://app.onoffmypc.com`, and `https://admin.onoffmypc.com`. A new domain
  must be added there or cookie-authenticated requests fail.
- On a slow network, Node's Happy Eyeballs abandons each connection attempt
  after 250 ms and `npx`/`wrangler` fail with ETIMEDOUT even though `curl`
  works. Set
  `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000`.
  That is environment-specific and not committed.

## Google sign-in (web)

The login and register pages use Google Identity Services with the **OnOffMyPC
Web** OAuth client:

`156303072600-50a2rt2j0gnb81nr093bi7jkcgln5rlq.apps.googleusercontent.com`

The browser sends the Google ID token to `POST /auth/google`; the API verifies
the audience against `GOOGLE_CLIENT_IDS` and sets the normal HttpOnly session
cookie. No client secret or token is stored in the browser.

### Google Cloud Console

1. APIs & Services → Credentials → **OnOffMyPC Web** (OAuth client, type Web
   application).
2. Under **Authorized JavaScript origins**, add every origin that serves the
   app:
   - `https://onoffmypc.com`
   - `https://www.onoffmypc.com`
   - `https://app.onoffmypc.com`
   - `http://localhost:3000` (local development)
3. No redirect URI is used by the Google Identity Services popup flow.
4. OAuth consent screen: ensure it is configured. While it is in **Testing**,
   only added test users can sign in; publish it for public use.
5. Keep `GOOGLE_CLIENT_IDS` on the Worker in sync. It already contains the Web
   and iOS client IDs.

If the button shows "did not initialize" or the console reports
`origin_mismatch`, the origin is missing from step 2. If Google rejects the
account, check the API error and the consent-screen test-user list.

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` overrides the built-in Web client ID at build
time (it is a public value).
