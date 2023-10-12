---
"@balancer/sdk": minor
---

Replace dataQueries with multicall (using Viem):

- Add `BATCHSIZE` config per network
- Onchain calls correctly mapped to pool/version
- Filter bricked pools from vulnerability
- Fix scalingFactor scaling
