---
"@balancer/sdk": minor
---

Replace dataQueries with multicallV3:

- Add multicallV3 ABI
- Add manual batching (instead of Viems) so we can maintain custom blockNo
- Onchain calls correctly mapped to pool/version
- Filter bricked pools from vulnerability
- Fix scalingFactor scaling
