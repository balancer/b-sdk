---
"@balancer/sdk": minor
---

* Refactor Swap class to work with new API SOR query response.
* Swap class has V2/V3 handler (V3 WIP in follow up PR)
* Swap example added
* Limits refactored to be internal to V2 implementation. buildCall used to create based on input Slippage. Returns minAmountOut/maxAmountIn for users.
* PriceImpact can no longer be calculated in Swap as missing pool state/maths. This has been removed for now and will be added as onchain helper in future.
