# @balancer/sdk

## 0.18.0

### Minor Changes

- 2e0ddce: Updates for 5th testnet release of v3 contracts on Sepolia

## 0.17.0

### Minor Changes

- 73dc1bc: Add support for add/remove liquidity on CoWAMM pools

## 0.16.0

### Minor Changes

- d81de73: Update SDK to use Permit2 and conform with new SC deployment

## 0.15.1

### Patch Changes

- 18087a8: Fixed price impact to return close to 0 on proportional amounts

## 0.15.0

### Minor Changes

- 0edf25b: Use callData instead of call for all build returns.

## 0.14.1

### Patch Changes

- 8e7c349: Refactor api client helper to match api changes
- efe7c94: Handle address correctly in BalancerApi. Example updates.

## 0.14.0

### Minor Changes

- 127bc2f: Add support for V3 Swaps (single and batchSwap). Breaking changes in Swap buildCall to handle path limits correctly.'
- a759fbf: Add Price Impact for swaps and batchSwaps

## 0.13.0

### Minor Changes

- 6974a7c: Add add/remove liquidity support for stable and metastable pools
- 87d1dbd: Refactor queryRemoveLiquidityRecovery into a separate method

### Patch Changes

- 33b23c6: Bump create pool test timeout

## 0.12.0

### Minor Changes

- dfacb04: Rename buildCall interface for consistency and clarity
- e2d66ce: Adds Initialize Pool functionality for V3 pools;
- c071850: Refactor useNativeAssetAsWrappedAmountIn adn toNativeAsset into wethIsEth
- 7bc308a: Move accountAddress from query to buildCall input

### Patch Changes

- 8825f0a: Refactor sender and recipient to exist on v2 only

## 0.11.0

### Minor Changes

- b77768a: Change all refs to balancerVersion to vaultVersion to match API.

## 0.10.0

### Minor Changes

- f5291c6: Add V3 Single Swap support.
- 517a13e: Add price impact for add/remove nested liquidity
- b547e32: Adds Balancer's V3 CreatePool functionality for Weighted Pools;

## 0.9.1

### Patch Changes

- 27296e6: expose mapPoolToNestedPoolState function
- 4851160: Add Base config.
- c359a54: add GYRO type for GYRO2 in pool type mapper
- 8d8a95f: Fix add liquidity nested not working for polygon (and other chains)

## 0.9.0

### Minor Changes

- cadb555: \* Refactor Swap class to work with new API SOR query response.
  - Swap class has V2/V3 handler (V3 WIP in follow up PR)
  - Swap example added
  - Limits refactored to be internal to V2 implementation. buildCall used to create based on input Slippage. Returns minAmountOut/maxAmountIn for users.
  - PriceImpact can no longer be calculated in Swap as missing pool state/maths. This has been removed for now and will be added as onchain helper in future.
- 40ee7be: Remove SOR related code & other stale code/exports.

## 0.8.1

### Patch Changes

- 579600a: Expose proportional amounts helper

## 0.8.0

### Minor Changes

- 8bd2454: Add Basic Remove Liquidity for v3
- 69d6567: Add limits calculation and data encoding in the swap
- 4c8114d: Add Basic Add Liquidity for v3

### Patch Changes

- 2593e8a: Expose JoinPoolRequest type
- dc09bf7: Remove type module from package.json
- c7c318a: Adding a function to calculate proportional amounts; Adding balancerVersion to the API Pools and Nested Pools data provider
- a1d52dc: Remove ambiguity from slippage interface
- 651e976: Add proportional amounts helper

## 0.7.1

### Patch Changes

- dec468a: Fix Add/Remove Liquidity Nested with zero amounts in
- 37f89a4: Bump tsup version
- 6c12bab: Expose Relayer class
- 69521d0: Fix cloneDeep import

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
