# @balancer/sdk

## 5.2.1

### Patch Changes

- 210fcd7: Update Sonic UnbalancedAddViaSwapRouter address.

## 5.2.0

### Minor Changes

- acc99c5: Add support for Add Liquidity Unbalanced Via Swap

## 5.1.3

### Patch Changes

- c8c2a65: fix-add-monad-addresses-and-update-tests

## 5.1.2

### Patch Changes

- b29cef6: add monad to CHAINS export

## 5.1.1

### Patch Changes

- dd5f5fd: bump viem from 2.44.4 to 2.45.0.
  Update Sonic deployments with new factory addresses.

## 5.1.0

### Minor Changes

- e34a2c0: new pool factories and monad contracts
- 8b31785: Update LBPFactory to v3
- 850d17c: add fixed price LBPs and improve input validators for LBPs

### Patch Changes

- d31fc84: Remove pool type Boosted
- 8b144d5: Remove duplicate ABIs
- e22d978: Add hooks to addresses
- e49bbb0: Remove CSP createPool functionality
- 568d700: Remove unnecessary dependencies

## 5.0.1

### Patch Changes

- 4b8c63c: Bump viem from 2.42.0 to 2.43.5.
  Bump @balancer-labs/balancer-maths from 0.0.37 to 0.0.38.
- 29e0d09: Fix incorrect swap parameter

## 5.0.0

### Major Changes

- f51af5f: **WHAT**: Removed wrapped token functionality from the `Token` class and introduced a new `NativeToken` class to handle native tokens (like ETH) separately.

  **WHY**: This change improves type safety and separation of concerns by distinguishing between ERC-20 tokens and native tokens, making the API more explicit and preventing confusion about token types.

  **HOW**: Update your code by:

  - Replace any usage of `Token` for native tokens with the new `NativeToken` class if using the wrapped functionality
  - If not using any wrapped functionality, the `Token` can remain as is
  - Import `NativeToken` from the SDK: `import { NativeToken } from '@balancer/sdk'`
  - Use `NativeToken` for native token operations instead of `Token` with wrapped functionality

## 4.10.1

### Patch Changes

- bca04a3: Bump Viem and Balancer Maths deps.

## 4.10.0

### Minor Changes

- d2e14fb: Add X Layer support.

## 4.9.0

### Minor Changes

- a398076: Bump Viem to 2.38.5. Use Viem Plasma chain.

## 4.8.1

### Patch Changes

- 5945fac: Fix scientific notation parsing for slippage inputs
- 992a082: update hyperevm block explorer

## 4.8.0

### Minor Changes

- ccc4bec: refactor Balancer API class
- 305d7db: add plasma chain

## 4.7.0

### Minor Changes

- 508c646: fetch permit2 from deployments and improve new chain deployment setup

## 4.6.0

### Minor Changes

- 2f5c270: feat: add lbp creation with migration functionality & bpt unlocking

## 4.5.2

### Patch Changes

- 729db90: adding HyperEvm to the API chain map
- 729db90: Fix api client for HyperEvm

## 4.5.1

### Patch Changes

- 01571a7: Add hyperEVM native asset config

## 4.5.0

### Minor Changes

- da8f344: Update reCLAMM addresses to V2. Also adds Sonic reCLAMM factory.

## 4.4.1

### Patch Changes

- 4d30a06: export address provider

## 4.4.0

### Minor Changes

- 06adec2: enable hyperEVM support

## 4.3.0

### Minor Changes

- 07638a9: additional abis for improved error reporting
- b5fb791: Add poolIds and considerPoolsWithHooks filters to sorSwapPaths.

### Patch Changes

- 9fc74d3: Update to active reclamm contracts

## 4.2.0

### Minor Changes

- b4cee37: Add address validation for network deployments

## 4.1.3

### Patch Changes

- ee2709e: fix gyro eclp param calculations for reversed token order with inverted params

## 4.1.2

### Patch Changes

- 112b340: fix failing test

## 4.1.1

### Patch Changes

- d0d958c: fix pnpm-workspace.yaml
- 6879394: API client headers

## 4.1.0

### Minor Changes

- 0c94547: adds lbp creation functionality

## 4.0.3

### Patch Changes

- 0a91173: Add permit2 address for optimism network

## 4.0.2

### Patch Changes

- 2ddcb83: Prevent biome from incorrectly formatting package.json

## 4.0.1

### Patch Changes

- b2a4be7: Fix ReClamm init lint issues

## 4.0.0

### Major Changes

- bc21824: Update dependencies to latest version

## 3.2.0

### Minor Changes

- 56e594d: Create and initialize Readjusting Concentrated Liquidity AMMs

## 3.1.0

### Minor Changes

- df0b8b2: update to latest avalanche deployments of balancer V3 contracts

## 3.0.0

### Major Changes

- 2137cc9: ## Summary
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
  } from "@balancer/sdk";

  const routerAddress = BALANCER_ROUTER[chainId];
  ```

  Now you should import and use addresses like this:

  ```typescript
  import { balancerV2Contracts } from "@balancer/sdk";
  import { balancerV3Contracts } from "@balancer/sdk";

  const routerAddressV2 = balancerV2Contracts.Router[chainId];
  const routerAddressV3 = balancerV3Contracts.Router[chainId];
  ```

  ### ABI Imports

  For ABI imports related to balancer V2 and V3 contracts. We have standardized the naming by appending `_V2` and `_V3` to `contractNameAbi`

  Example

  ```typescript
  import { vaultAbi_V2, vaultAbi_V3 } from "@balancer/sdk";
  ```

### Patch Changes

- f0a0416: Only mapPoolType for V2. V3 can use string as given.

## 2.7.1

### Patch Changes

- 57d2532: Fix Install check in our CI pipeline

## 2.7.0

### Minor Changes

- a3e92ad: add avalanche support

## 2.6.0

### Minor Changes

- fee401c: Refactor input validation errors as SDKError

### Patch Changes

- 061f490: Remove test no longer necessary on gnosis-chain
- 72a0ded: Refactor price impact errors as SDKError
- 9240e75: Error Handling - Propagate SC Errors

## 2.5.1

### Patch Changes

- 3763ca1: Update GyroECLP factory addresses and ABI

## 2.5.0

### Minor Changes

- c9b73ec: calculate derived params for gyro eclp pools

## 2.4.0

### Minor Changes

- 7fc01a9: create gyro E-CLP on v3

### Patch Changes

- 05f8937: Fix type checking for CI

## 2.3.1

### Patch Changes

- c692d85: Fix test failing intermittently on CI
- 7025ec9: Fix PI error message

## 2.3.0

### Minor Changes

- 47b3caa: Add support for monad testnet'

## 2.2.0

### Minor Changes

- b9130c3: split constants into general and version specific files

### Patch Changes

- 14bb7ba: Fix TokenAmount.toSignificant with very small amounts

## 2.1.3

### Patch Changes

- 48d4fd9: Fix price impact for add liquidity boosted on near proportional inputs

## 2.1.2

### Patch Changes

- e0e38b3: Update production Composite router addresses.

## 2.1.1

### Patch Changes

- e4d2938: Update stableSurge to release version and addresses.

## 2.1.0

### Minor Changes

- 7a62a77: Add StableSurge create support.

## 2.0.0

### Major Changes

- 187fac2: new composite router for boosted operations with ability to wrap/unwrap single token

## 1.4.3

### Patch Changes

- ac22bc9: V2 nested mapping should not use underlying token.

## 1.4.2

### Patch Changes

- dfdaa39: Add Missing isBuffer field for sorGetSwapPaths query.
- da7dc97: Fix PermitHelper owner to support viem Account as input

## 1.4.1

### Patch Changes

- cca357f: Export calculateProportionalAmountsBoosted helper

## 1.4.0

### Minor Changes

- bd1aa32: Add Base and Arbitrum support for V3

## 1.3.0

### Minor Changes

- 0734b88: permit2 helpers for pool init

### Patch Changes

- 4a68326: Fix getPoolStateWithBalancesV3 helper

## 1.2.0

### Minor Changes

- 80b3e49: Add Sonic V3 support.

### Patch Changes

- 411ff7e: Bump viem version and undo custom sonic setup (as multicall3 is already defined in the new viem version)

## 1.1.0

### Minor Changes

- 00d2037: Add query blockno param for add/remove liq (not V2).

## 1.0.2

### Patch Changes

- eb5be5d: fix: update sonic multicall3 creation blocknumber
- eb5be5d: fix: override multicall3 for sonic in viem chain definition
- 1b47dfb: Skip flaky test

## 1.0.1

### Patch Changes

- e5a0311: Bump composable stable pool factories to v6
- 79c8144: Refactor swaps v3 integration tests
- 1c58adc: Add support for Sonic chain

## 1.0.0

### Major Changes

- b3d61f2: Remove `queryRemoveLiquidityRecovery` from `RemoveLiquidity`. Please use `query` with `RemoveLiquidityRecoveryInput` instead.

### Minor Changes

- 8aa2fb9: Add native token support to AddLiquidityNested and AddLiquidityBoosted
- a6ebf0d: Add support for InitBuffer
- 15567ec: Add support for addLiquidityBuffer

### Patch Changes

- e3fdf6c: Add extra integration tests for gyro pools

## 0.33.5

### Patch Changes

- 378a8f0: Fix price impact with near proportional inputs for AddLiquidityNested

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
