---
"@balancer/sdk": major
---

## Summary
Using script to automate balancer address and ABI updates as new deployments roll out


## Breaking Changes
- Contract addresses are now exported through `balancerV2Contracts` and `balancerV3Contracts` objects instead of individual exports
- Contract ABIs follow consistent nameing pattern of `contractNameAbi_ProtocolVersion`

## How Consumers Should Update

### Address Imports

Previously you would import addresses like this:

```typescript
import {
  BALANCER_BATCH_ROUTER,
  BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
  BALANCER_ROUTER,
  PERMIT2,
  VAULT_ADMIN,
  VAULT_V3,
} from '@balancer/sdk'

const routerAddress = BALANCER_ROUTER[chainId]
```

Now you should import and use addresses like this:

```typescript
import { balancerV3Contracts } from '@balancer/sdk'

const routerAddress = balancerV3Contracts.Router[chainId]
```


### ABI Imports

For ABI imports related to balancer V2 and V3 contracts. We have standardized the naming by appending `_V2` and `_V3` to `contractNameAbi`

Example

```typescript
import { vaultAbi_V2, vaultAbi_V3 } from '@balancer/sdk'
```
