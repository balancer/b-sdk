# @balancer/sdk

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
