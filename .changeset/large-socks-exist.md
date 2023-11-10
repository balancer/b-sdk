---
"@balancer/sdk": minor
---

- Add add/remove liquidity pool support (non-nested pools)
- Weighted pool type
- ComposableStable pool type
- Uses balancerHelpers to query amounts in/out rather than relying on specific pool math and associated data
- Integration tests run against local viem fork
