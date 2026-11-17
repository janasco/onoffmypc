# Contributing

OnOffMyPC is maintained solely by [@janasco](https://github.com/janasco).
External contributions are not accepted at this time.

## Commit identity

Every commit MUST be authored and committed as:

```text
janasco <46880335+janasco@users.noreply.github.com>
```

Configure the clone before committing:

```bash
git config user.name "janasco"
git config user.email "46880335+janasco@users.noreply.github.com"
```

Do not commit under a project, bot, shared, or machine identity.

## No tool attribution

Do not add AI-tool attribution, AI co-author trailers (for example,
`Co-authored-by:`), or AI-generated markers to commit messages, pull-request
text, source code, or comments. Write commits and code as the project author.

## Before a change

- Keep changes scoped to the component they affect.
- Run the checks in the component's README or `.github/workflows/`.
- Never commit credentials, release binaries, or generated release artifacts.
- Follow `design/docs/` for user-facing visual and state-language rules.
