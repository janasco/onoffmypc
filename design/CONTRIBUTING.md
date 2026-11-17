# Contributing

The design system is maintained solely by [@janasco](https://github.com/janasco).
Every commit MUST be authored and committed as
`janasco <46880335+janasco@users.noreply.github.com>`. Do not add AI-tool
attribution, AI co-author trailers, or AI-generated markers to commit messages,
pull-request text, source code, or comments.

Edit sources under `tokens/`, `states/`, `content/`, `assets/`, or `docs/`, then
run:

```bash
corepack pnpm build
corepack pnpm check
corepack pnpm test
```

Include the user problem, affected platforms, before/after evidence, state and
accessibility implications, and a migration note for any changed public name.
Do not hand-edit `dist/`.

When all product repositories are available as sibling directories, run
`corepack pnpm check:consumers` to inspect adoption. After reviewing the
generated diff, `corepack pnpm sync:consumers` safely copies current artifacts
to the pre-existing destinations declared in `consumers.json`. Never add a
consumer by pointing the manifest at an unreviewed or symbolic-link path.
