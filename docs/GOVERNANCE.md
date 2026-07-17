# Governance and releases

## Ownership

Changes affecting machine-state meaning require backend and client review.
Changes affecting a platform component require review from that platform.
Visual-only changes still require light/dark, responsive, and accessibility
evidence. User-facing state or recovery copy must also follow
[the UX writing rules](UX_WRITING.md) and remain consistent with
`content/en.json`.

## Versioning

- Patch: correction that does not rename a public token or change meaning.
- Minor: additive token, state presentation, asset, or component capability.
- Major: removal, rename, semantic reassignment, or behavior change requiring a
  consumer migration.

Breaking changes may occur during `0.x`, but every release still includes a
changelog and migration note. Stable tokens are deprecated before removal once
the package reaches `1.x`.

## Release checklist

1. Update the source version and changelog.
2. Run `pnpm build`, `pnpm check`, and `pnpm test`.
3. Review generated diffs and contrast output.
4. Validate representative light/dark examples and state copy.
5. In the multi-repository workspace, run `pnpm check:consumers`, review the
   distribution plan, and use `pnpm sync:consumers` to update existing vendored
   files.
6. Create reviewed consumer update pull requests; never push generated output
   directly to a production branch.
7. Pin consumers to the release so rollback is a version change.

## Consumer rule

Generated files contain a “Do not edit” header. A consumer may temporarily
alias an old name to a generated role, but it must not fork the canonical value
or redefine product-state meaning locally.
