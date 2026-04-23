# Skill: add a changeset

Use this when your PR changes anything a downstream `@balancer/sdk` consumer can observe. Release notes and version bumps come from these files — no changeset means no release.

## Do not run `pnpm changeset`

`pnpm changeset` is interactive (TTY prompts for bump level and summary). Agents should **write the file directly** instead — the result is identical.

## How to add one

Create `.changeset/<kebab-case-slug>.md` with this exact shape:

```markdown
---
"@balancer/sdk": <patch|minor|major>
---

<one-line summary in the imperative, ending with a period.>
```

- `<kebab-case-slug>` should describe the change, e.g. `fix-v3-swap-limits`, `add-sonic-deployments`, `gyro-eclp-fork-block-fix`. It must be unique among existing `.changeset/*.md` files and must not be `README` or `config`.
- The blank line between the closing `---` and the summary is required.
- Keep the summary to one line. If more context is needed, add plain prose paragraphs below it — they show up verbatim in the CHANGELOG.

## Choosing the bump

- **patch** — bug fixes, internal refactors, test-only changes, new chain/contract-address entries, docs, dependency bumps that don't change the public API.
- **minor** — new exported functionality (new entity method, new `PoolType`, new router support) that is strictly additive.
- **major** — any breaking change to an exported type, function signature, enum value, or runtime behavior that existing consumers rely on. When in doubt between minor and major, pick major.

The repo is pre-1.0 in spirit (see README: "Interfaces may have frequent breaking changes"), but the version is well past 1.0, so treat semver strictly — downstream apps pin on caret ranges.

## When to skip

You may skip a changeset **only** if the change is invisible to consumers of the published package:

- edits under `test/`, `examples/`, `scripts/`, `.github/`, `.changeset/README.md`
- edits to `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.agents/`
- `biome.json`, `tsconfig.json`, `vitest.config.mts`, `tsup.config.ts` changes that don't alter build output
- CI-only workflow edits

If your diff touches `src/**` at all, add a changeset.

## Reference

Real example from this repo (`.changeset/gyro-eclp-fork-block-fix.md` at commit `a77acd6f`):

```markdown
---
"@balancer/sdk": patch
---

Bump GyroECLP integration test fork block to include factory deployment.
```

Config lives at `.changeset/config.json`; `baseBranch` is `main` and `access` is `public`. The `Version Packages` PR is produced automatically by `.github/workflows/release.yml` — do not bump `package.json` or edit `CHANGELOG.md` by hand.
