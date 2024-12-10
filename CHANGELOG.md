# @balancer/sdk

## 0.33.4

### Patch Changes

- 20aeefc: chore: debug v2 pool state multicall errors

## 0.33.3

### Patch Changes

- 6ec44e1: Update to main deployments (Mainnet, Gnosis and Sepolia)
- 688d857: Add permit and permit2 signature examples

## 0.33.2

### Patch Changes

- 863822c: Use correct index for underlying token redeem call.

## 0.33.1

### Patch Changes

- b2b9411: Enable add liquidity proportional for stable pools on v3

## 0.33.0

### Minor Changes

- 2d192ff: Update to testnet deployment 11

## 0.32.2

### Patch Changes

- c5e3ffd: Refactor nestedPoolState logic to fetch mainTokens from api
- ac0c5a5: Add proportional helper to calculate BPT from a reference amount for boosted pools
- 2712ee0: Fix getPoolStateWithBalancesV3 with less 18 decimals tokens
- 1455fde: Fix circular dependency on price impact implementation

## 0.32.1

### Patch Changes

- 603fbd5: fix: nested single token remove v2 validation

## 0.32.0

### Minor Changes

- b927594: Tidy nested types. Share common with boosted.
  Support for V3 addLiquidityNested PI (including nested boosted).
- f2f1e42: BPT swaps as first step & change of batch router address

### Patch Changes

- dcd1f0d: PriceImpact error handling and messaging improvements.
  - Catch any errors with initial add/remove steps - these are thrown because the user input is valid, e.g. would cause INVARIANT_GROWTH errors
  - Catch any errors in query during unbalanced calc steps and throw message that will help with debug - e.g. caused by delta amounts
- 52fed3d: Fix PI test.

## 0.31.2

### Patch Changes

- 72a96fb: fix: validateBuffer check for V2 buffer array.

## 0.31.1

### Patch Changes

- 46bcb86: Update CompositeRouter address (deploy10 version with bug fix).
  Remove CompositeRouter workarounds for Boosted Price Impact.

## 0.31.0

### Minor Changes

- a1b87c6: Add to field to query outputs. Useful for correct approval spender before build.
- e234fc1: Remove Swap Price Impact function and tests.
- 4e32362: Add optional sender and userData inputs for add/remove/swap queries. Sender can be used to query accurate result when pool may have hook thats behaviour is affected by sender, e.g. loyalty fee hook.

### Patch Changes

- 2a664ce: Make boosted add/remove support partial boosted.
- a33d0fc: Expose isBatchSwap on swap class

## 0.30.1

### Patch Changes

- a080968: chore: remove unused totalShares field from PoolStateWithUnderlyings type

## 0.30.0

### Minor Changes

- 1ce9784: added add and remove liquidity for boosted pools

## 0.29.1

### Patch Changes

- 84f3259: Full nested pool support and tests.

## 0.29.0

### Minor Changes

- 8d4d0ee: Add add/remove support for V3 nested pools.
- ae2c177: Update to Deploy 10.

### Patch Changes

- 1a85f89: Re-deploy force.

## 0.28.2

### Patch Changes

- 5442afb: Add support for userData to v3 swaps

## 0.28.1

### Patch Changes

- d64eb0f: Update vault extension ABI to deploy9 version.

## 0.28.0

### Minor Changes

- b00b8d0: Update to deploy 9
- 128313b: Support for v3 stable pool creation

## 0.27.0

### Minor Changes

- cc78c64: Add zero address sender to multicall calls to avoid issues with Nethermind/Geth nodes

## 0.26.1

### Patch Changes

- 2be2b58: Add OPTIMISM_RPC_URL to test envs
- 503f72a: Exposes PublicWalletClient type

## 0.26.0

### Minor Changes

- c2c454d: Update to 8th testnet release of v3

### Patch Changes

- 74322d3: Add vault and vault extension abis to any router interactions to enable decoded error messages.

## 0.25.0

### Minor Changes

- 3da1e5b: Update Add Liquidity Proportional to expect any referenceAmount as input

## 0.24.0

### Minor Changes

- 0aecec7: added add liquidity proportional for v3
- 2fd169e: added remove liq recovery

### Patch Changes

- ce5e764: Add support for v2 on sepolia
- 1626f5f: Accept ETH as input on buildCallWithPermit

## 0.23.0

### Minor Changes

- a3fe914: update sdk to work with the seventh testnet deployment

### Patch Changes

- 6742fb5: Fix calculate proportional amounts rounding direction for Cow Amm

## 0.22.4

### Patch Changes

- de32a7c: Fix add liquidity proportional query for cow-amm

## 0.22.3

### Patch Changes

- 838f09e: Remove round down from calculateProportionalAmounts

## 0.22.2

### Patch Changes

- ec27a5c: Fix outputReference index being incorrectly consumed

## 0.22.1

### Patch Changes

- 2fffd77: Fix remove liquidity nested query (peek) logic

## 0.22.0

### Minor Changes

- c5b4287: Adds buffer/boosted pool support to swaps.

## 0.21.0

### Minor Changes

- e3c6b5e: Add buildCallWithPermit variations for add/remove/swap operations

### Patch Changes

- f64866f: Round down calculateAmountsProportional amounts

## 0.20.5

### Patch Changes

- a0edf51: Fix remove liquidity nested for ComposableStable pools

## 0.20.4

### Patch Changes

- 1a41d80: Filter phantomBpt in mapPoolToNestedPoolState.

## 0.20.3

### Patch Changes

- 39db20c: Add missing config for Avalanche and ZkEvm.

## 0.20.2

### Patch Changes

- 9aa847e: Fix Balancer Queries address for Avalanche

## 0.20.1

### Patch Changes

- 5c353a3: Add support for chain: Fraxtal
- dc5a323: Add support for chain: Mode
- 42d3d71: Expose Batch Router ABI

## 0.20.0

### Minor Changes

- 07b6eaa: Update to use deploy 6.

## 0.19.2

### Patch Changes

- 835d023: Relayer auth read signers nonce.

## 0.19.1

### Patch Changes

- 654af8c: Expose isAuraBalSwap helper.

## 0.19.0

### Minor Changes

- de03793: Changes vaultVersion to protocolVersion to match API.
  CowAMM uses protocolVersion 1 instead of 0.
  Add support for auraBal swaps to BAL/WETH/ETH on V2 via Relayer.

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
