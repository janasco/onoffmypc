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
| Domains | `onoffmypc.com`, `www.onoffmypc.com` (www 301s to the apex) |
| Build output | `out/` (from `output: "export"` in `next.config.ts`) |

`app.onoffmypc.com` and `admin.onoffmypc.com` are separate Pages projects
(`onoffmypc-dashboard`, `onoffmypc-admin`). Moving the dashboard onto this app
means removing that custom domain from the old project and adding it here — a
separate decision, not part of a normal deploy.

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
- On this machine, Node needs `NODE_OPTIONS=--no-network-family-autoselection`
  because it has no IPv6 route and Node does not fall back to IPv4; without it
  `npx`/`wrangler` time out. That is machine-specific and not committed.
