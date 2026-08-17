---
name: changeset
description: Write a changeset for @balancer/sdk. Use when a diff touches src/**, when picking a patch/minor/major bump, or when a PR needs release notes.
---

# Add a changeset

A PR whose diff touches `src/**` needs a changeset. Version bumps and release notes are generated from these files, so no changeset means no release. Changes confined to `test/`, `examples/`, `scripts/`, `.github/`, docs, and tooling config skip it.

## Write the file directly

`pnpm changeset` prompts on a TTY, so write the markdown yourself — the result is identical.

Create `.changeset/<kebab-case-slug>.md`:

```markdown
---
"@balancer/sdk": <patch|minor|major>
---

<one imperative sentence ending with a period.>
```

- The slug describes the change (`fix-v3-swap-limits`, `add-sonic-deployments`), is unique among the existing `.changeset/*.md`, and is neither `README` nor `config`.
- The blank line after the closing `---` is required.
- Everything below the frontmatter lands verbatim in `CHANGELOG.md`, with the commit hash prefixed to the first line (`- fdb61c7: Fix Permit2 spender…`). Keep that first line a plain sentence — a `#` heading there renders as literal text next to the hash.
- For a breaking change, follow that sentence with prose paragraphs covering what consumers must change, with a concrete before/after. `CHANGELOG.md` holds every past summary — read the recent entries to match the house voice.

## Choosing the bump

- **patch** — bug fixes, internal refactors, new chain or contract-address entries, dependency bumps that leave the public API unchanged.
- **minor** — strictly additive exported functionality: a new entity method, `PoolType`, or router.
- **major** — a breaking change to an exported type, function signature, enum value, or runtime behavior consumers rely on. Torn between minor and major, pick major — downstream apps pin caret ranges.

Example of a major body, trimmed:

```markdown
---
"@balancer/sdk": major
---

Interpret RemoveLiquidityBoostedV3 tokensOut per pool token index rather than as a flat address map.

**Breaking change**: pass one address per pool token slot, in sorted-index order — either that leg's pool token or, for ERC4626 legs, its underlying. Callers of partialBoostedPool_WETH_stataUSDT previously passing [USDT, WETH] must now pass [WETH, USDT]. This fixes wrong unwrap flags (and BufferNotInitialized reverts) when one leg's underlying is another leg's pool token.
```

## Verify

Run `pnpm changeset status --since=main`. Exit 0 with the pending bump listed means changesets picked the file up; a nonzero exit means it did not parse or was never written. The same command also exits nonzero on a diff that legitimately skips a changeset — for those, the untouched `src/**` is the answer, not a new file.

## Guardrails

`CHANGELOG.md` and the `package.json` version belong to the `Version Packages` PR that `.github/workflows/release.yml` opens from merged changesets — leave both as they are.
