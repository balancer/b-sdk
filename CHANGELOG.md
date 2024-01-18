# @balancer/sdk

## 0.7.0

### Minor Changes

- 5cac427: Safe updating all packages; Hard updating viem from v1 to v2;
- a126243: return null when there are no candidatePaths when using `sorGetSwapsWithPools` so `getBestPaaths` doesnt throw
- 79e9e81: Add dpdm as circular dependency linter
- 584914b: - Add AddLiquidityNested
  - Add RemoveLiquidityNestedProportional
  - Add RemoveLiquidityNestedSingleToken
- 79e9e81: Replace rome with biome
- ffed733: Add v3 scaffold implementation

### Patch Changes

- 54c8925: Fixing InitPoolDataProvider to work with other poolTypes and with less input parameters;
- 16a7cce: Adding balancer v3 scaffold for init pool data provider;
- fc21f1e: Minor refactors and lint fixes
- e59f1b2: Removing duplicated constant BALANCER_VAULT and replacing by VAULT[chainId]
- 4bdc6f0: Removing BalancerHelpers contract and replacing it by BalancerQueries;

## 0.6.0

### Minor Changes

- 48d14de: Adapting pool type from API to PoolType, so we can generally use PoolType instead of string in the whole project.
- 60eebf8: Adding InitPool functionality for Composable Stable Pools

### Patch Changes

- 38c3aa2: Replace shared human readable abi with abis from ts files
- ae7b19e: Update api client to match pool type changes

## 0.5.0

### Minor Changes

- b8523b1: Add create pool for composable stable pools
- 43715b5: Add OP native asset and remove unused constant STELLATE_URL

### Patch Changes

- 1e3ad86: expose priceImpact amount

## 0.4.0

### Minor Changes

- e7a8237: Adding InitPool Functionality for Weighted Pools;
  Abstracting Input validation into a new class InputValidator;
  Moving "encodeUserData" functions from other modules to encoders;
- 7fff3d9: Adding the CreatePool class with the functionality to create weighted pools; Added integration tests for Weighted Pool Creation
- d8dc287: Add price impact calculations for add/remove liquidity and swaps

### Patch Changes

- b97bff1: Discard paths with failing limits

## 0.3.1

### Patch Changes

- 4eda061: Add Op pools from vulnerability to filter list.

## 0.3.0

### Minor Changes

- e1efe6b: - Add add/remove liquidity pool support (non-nested pools)
  - Weighted pool type
  - ComposableStable pool type
  - Uses balancerHelpers to query amounts in/out rather than relying on specific pool math and associated data
  - Integration tests run against local viem fork
- 73b19fc: Adds Balancer API Provider. A utility module designed to fetch pool data from [API](https://github.com/beethovenxfi/beethovenx-backend/blob/v3-main/README.md#branching-and-deployment-environments).

## 0.2.0

### Minor Changes

- f6d1051: Add Fantom config. Update to have network specific vault addr.
- 67e4120: Replace dataQueries with multicall (using Viem):

  - Add `BATCHSIZE` config per network
  - Onchain calls correctly mapped to pool/version
  - Filter bricked pools from vulnerability
  - Fix scalingFactor scaling

## 0.1.2

### Patch Changes

- 7004561: Add missing gyro3 to SupportedRawPoolTypes.

## 0.1.1

### Patch Changes

- ec6fda0: Switched to vitest. Updated viem to fix parseUnits issue

## 0.1.0

### Minor Changes

- f04362c: The onChainPoolDataEnricher now also queries the pool rate, linearTargets as well as status of inRecoveryMode and isPaused

## 0.0.5

### Patch Changes

- 6a49fbc: Gyro pool support
- 99f0982: FX pool support

## 0.0.4

### Patch Changes

- 664f0c0: Automate releases with changesets
