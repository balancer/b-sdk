---
"@balancer/sdk": patch
---

Fix Permit2 spender for add liquidity unbalanced via swap to use UnbalancedAddViaSwapRouter, and sign the slippage-adjusted max adjustable amount.
