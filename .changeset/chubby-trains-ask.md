---
"@balancer/sdk": major
---

# Fix boosted V3 proportional remove tokensOut when the same address exits two pool legs

RemoveLiquidityBoostedV3 no longer infers unwrapWrapped from a flat address map plus sort. tokensOut is interpreted per pool token index (same order as poolState.tokens sorted by index): each entry must be either that leg's pool token address or, for ERC4626 legs, its underlying address. This fixes incorrect unwrap flags (and reverts such as BufferNotInitialized) when one pool token is an ERC4626 share whose underlying is the same token as another pool leg.

**Breaking change**: Callers must pass tokensOut in vault / pool token index order. Previously, unique addresses could be passed in any order because the SDK sorted by resolved index; that behavior is removed. Pass one address per pool token slot, aligned with sorted index. Concrete example: partialBoostedPool_WETH_stataUSDT has WETH at index 0 and stataUSDT at index 1; callers previously passing [USDT, WETH] must now pass [WETH, USDT].
