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

<imperative summary ending with a period. For breaking or nuanced changes, add a `#` heading and prose paragraphs below it.>
```

- `<kebab-case-slug>` should describe the change, e.g. `fix-v3-swap-limits`, `add-sonic-deployments`, `gyro-eclp-fork-block-fix`. It must be unique among existing `.changeset/*.md` files and must not be `README` or `config`.
- The blank line between the closing `---` and the summary is required.
- Default to a single-line summary. For `major` bumps or anything a consumer needs migration notes for, lead with a `#` heading, then add plain prose paragraphs — everything below the frontmatter lands verbatim in the CHANGELOG.

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

## Reference Examples

### Major — breaking change with migration notes

```markdown
---
"@balancer/sdk": major
---

# Fix boosted V3 proportional remove tokensOut when the same address exits two pool legs

RemoveLiquidityBoostedV3 no longer infers unwrapWrapped from a flat address map plus sort. tokensOut is interpreted per pool token index (same order as poolState.tokens sorted by index): each entry must be either that leg's pool token address or, for ERC4626 legs, its underlying address. This fixes incorrect unwrap flags (and reverts such as BufferNotInitialized) when one pool token is an ERC4626 share whose underlying is the same token as another pool leg.

**Breaking change**: Callers must pass tokensOut in vault / pool token index order. Previously, unique addresses could be passed in any order because the SDK sorted by resolved index; that behavior is removed. Pass one address per pool token slot, aligned with sorted index. Concrete example: partialBoostedPool_WETH_stataUSDT has WETH at index 0 and stataUSDT at index 1; callers previously passing [USDT, WETH] must now pass [WETH, USDT].
```

### Minor — strictly additive feature

```markdown
---
"@balancer/sdk": minor
---

Add support for Add Liquidity Unbalanced Via Swap.
```

### Patch — contract address updates and bug fixes

```markdown
---
"@balancer/sdk": patch
---

Update GyroECLP factory to latest (longer pause window).
```



## Guardrails

Never edit `CHANGELOG.md` or bump `package.json` by hand — the `Version Packages` PR from `.github/workflows/release.yml` does both from merged changesets.
