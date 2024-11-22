# SDK

WIP SDK for Balancer Protocol. Interfaces may have frequent breaking changes until a stable release.

## Local Setup

`pnpm install`

### Requirements

- `fetch`

### Polyfill

If your platform does not support one of the required features, it is also possible to import a polyfill.

- `fetch` -> [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

### Testing

`pnpm test`

Testing runs against a local anvil fork and requires the following RPC URL to be configured in your .env file:
```
ETHEREUM_RPC_URL
POLYGON_RPC_URL
FANTOM_RPC_URL
SEPOLIA_RPC_URL
```
**Anvil Client**

To download and install the anvil client, run the following commands (MacOS):
- `curl -L https://foundry.paradigm.xyz | bash`
- `brew install libusb`
- `source /Users/$(whoami)/.zshenv`
- `foundryup`

# Documentation

## Installation

The [Balancer SDK](https://www.npmjs.com/package/@balancer-labs/sdk) is a Typescript/Javascript library for interfacing with the Balancer protocol and can be installed with:

```bash
pnpm add @balancer-labs/sdk
```

# API

## AddLiquidity

This class provides functionality to:
* Perform on-chain queries to see the result of an addLiqudity operation
* Build an addLiquidity transaction, with slippage, for a consumer to submit
* Supported add types: SingleToken, Unbalanced, Proportional
* Supports Balancer V2 & V3

### Example

See the [addLiqudity example](/examples/addLiquidity/addLiquidity.ts).

### Constructor

```typescript
const addLiquidity = new AddLiquidity();
```

### Methods

### query

Simulate addLiquidity operation by using an onchain call.

```typescript
query(
  input: AddLiquidityInput, 
  poolState: PoolState
): Promise<AddLiquidityQueryOutput>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [AddLiquidityInput](./src/entities/addLiquidity/types.ts#L38) | User defined inputs |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being added to |

**Returns**

```typescript
Promise<AddLiquidityQueryOutput>
```

[AddLiquidityQueryOutput](./src/entities/addLiquidity/types.ts#L54) - Data that can be passed to `buildCall`. Includes updated `bptOut` amount.
___

### buildCall

Builds the addLiquidity transaction using user defined slippage.

```typescript
buildCall(input: AddLiquidityBuildCallInput): AddLiquidityBuildCallOutput
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [AddLiquidityBuildCallInput](./src/entities/addLiquidity/types.ts#L63) | Parameters required to build the call including user defined slippage |

**Returns**

```typescript
AddLiquidityBuildCallOutput
```

[AddLiquidityBuildCallOutput](./src/entities/addLiquidity/types.ts#L75) - Encoded call data for addLiquidity that user can submit.
___

### buildCallWithPermit2

Builds the addLiquidity transaction and approves amounts through a Permit2 signature.
  
```typescript
buildCallWithPermit2(input: AddLiquidityBuildCallInput, permit2: Permit2): AddLiquidityBuildCallOutput
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [AddLiquidityBuildCallInput](./src/entities/addLiquidity/types.ts#L63) | Parameters required to build the call including user defined slippage |
| permit2 | [Permit2](./src/entities/permit2Helper/index.ts#L35) | Permit2 signature |
*Note: refer to [Permit2Helper](#calculateproportionalamounts) for a Permit2 helper function*

**Returns**

```typescript
AddLiquidityBuildCallOutput
```

[AddLiquidityBuildCallOutput](./src/entities/addLiquidity/types.ts#L75) - Encoded call data for addLiquidity that user can submit.
___


## RemoveLiquidity

This class provides functionality to:
* Perform on-chain queries to see the result of an removeLiqudity operation
* Build a removeLiquidity transaction, with slippage, for a consumer to submit
* Supported remove types: Unbalanced, SingleTokenExactOutInput, SingleTokenExactInInput, Proportional
* Supports Balancer V2 & V3

### Example

See the [removeLiqudity example](/examples/removeLiquidity/removeLiquidity.ts).

### Constructor

```typescript
const removeLiquidity = new RemoveLiquidity();
```

### Methods

### query

Simulate removeLiquidity operation by using an onchain call.

```typescript
query(
  input: RemoveLiquidityInput,
  poolState: PoolState,
): Promise<RemoveLiquidityQueryOutput>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [RemoveLiquidityInput](./src/entities/removeLiquidity/types.ts#L52) | User defined inputs |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being removed from |

**Returns**

```typescript
Promise<RemoveLiquidityQueryOutput>
```

[RemoveLiquidityQueryOutput](./src/entities/removeLiquidity/types.ts#L70) - Data that can be passed to `buildCall`. Includes updated `amountsOut` amount.
___

### queryRemoveLiquidityRecovery

Calculates proportional exit using pool state. Note - this does not do an onchain query.

```typescript
queryRemoveLiquidityRecovery(
  input: RemoveLiquidityRecoveryInput,
  poolState: PoolState,
): Promise<RemoveLiquidityQueryOutput> 
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [RemoveLiquidityRecoveryInput](./src/entities/removeLiquidity/types.ts#L47) | User defined inputs |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being removed from |

**Returns**

```typescript
Promise<RemoveLiquidityQueryOutput>
```

[RemoveLiquidityQueryOutput](./src/entities/removeLiquidity/types.ts#L70) - Data that can be passed to `buildCall`. Includes updated `amountsOut` amount.
___

### buildCall

Builds the removeLiquidity transaction using user defined slippage.

```typescript
buildCall(
  input: RemoveLiquidityBuildCallInput,
): RemoveLiquidityBuildCallOutput
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [RemoveLiquidityBuildCallInput](./src/entities/removeLiquidity/types.ts#L79) | Input with user defined slippage |

**Returns**

```typescript
RemoveLiquidityBuildCallOutput
```

[RemoveLiquidityBuildCallOutput](./src/entities/removeLiquidity/types.ts#L83) - Encoded call data for addLiquidity that user can submit.
___

## Swap

This class provides functionality to:
* Perform on-chain queries to see the result of a Swap operation
* Build a Swap transaction, with slippage, for a consumer to submit
* Supports Balancer V2 & V3

### Example

See the [swap example](/examples/swaps/swap.ts).

### Constructor

```typescript
const swap = new Swap(swapInput: SwapInput);
```

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| swapInput | [SwapInput](./src/entities/swap/types.ts#L8) | Swap input including path information. |

Note: `SwapInput` data is normally returned from an API SOR query but may be constructed manually.

### Methods

### query

Gets up to date swap result by querying onchain.

```typescript
query(
  rpcUrl?: string,
  block?: bigint,
): Promise<ExactInQueryOutput | ExactOutQueryOutput> 
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| rpcUrl (optional) | string | RPC URL, e.g. Infura/Alchemy |
| block (optional) | bigint | Block no to perform the query |

**Returns**

```typescript
Promise<ExactInQueryOutput | ExactOutQueryOutput>
```

[ExactInQueryOutput](./src/entities/swap/types.ts#L44)
[ExactOutQueryOutput](./src/entities/swap/types.ts#L49)

The upated return for the given swap, either `expectedAmountOut` or `expectedAmountIn` depending on swap kind.
___

### buildCall

Builds the swap transaction using user defined slippage.

```typescript
buildCall(
  input: SwapBuildCallInput,
): SwapBuildOutputExactIn | SwapBuildOutputExactOut
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [SwapBuildCallInput](./src/entities/swap/types.ts#L21) | Input with user defined slippage |

**Returns**

```typescript
SwapBuildOutputExactIn | SwapBuildOutputExactOut
```

[SwapBuildOutputExactIn](./src/entities/swap/types.ts#L31)
[SwapBuildOutputExactOut](./src/entities/swap/types.ts#L35)

[RemoveLiquidityBuildCallOutput](./src/entities/removeLiquidity/types.ts#L83) - Encoded call data for swap that user can submit. Includes `minAmountOut` or `maxAmountIn` depending on swap kind.
___

### quote

Gives the combined return amount for all paths. Note - this always uses the original path amounts provided in constructor and does not get updated.

```typescript
public get quote(): TokenAmount
```

**Returns**

```typescript
TokenAmount
```

[TokenAmount](./src/entities/tokenAmount.ts) - Gives the combined return amount for all paths (output amount for givenIn, input amount for givenOut).
___

### inputAmount

```typescript
public get inputAmount(): TokenAmount
```

**Returns**

```typescript
TokenAmount
```

[TokenAmount](./src/entities/tokenAmount.ts) - Gives the combined input amount for all paths.
___

### outputAmount

```typescript
public get outputAmount(): TokenAmount
```

**Returns**

```typescript
TokenAmount
```

[TokenAmount](./src/entities/tokenAmount.ts) - Gives the combined output amount for all paths.
___

### queryCallData

```typescript
public queryCallData(): string
```

**Returns**

```typescript
string
```

Encoded query data for swap that a user can call to get an updated amount.
___

## PriceImpact

This class provides helper functions to calculate Price Impact for add/remove/swap actions.
* Supports Balancer V2 & V3

### Example

See the [price impact example](/examples/priceImpact/addLiquidity.ts).

### Methods

### addLiquiditySingleToken

Calculate price impact on add liquidity single token operations.

```typescript
addLiquiditySingleToken(
  input: AddLiquiditySingleTokenInput,
  poolState: PoolState,
): Promise<PriceImpactAmount> 
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [AddLiquiditySingleTokenInput](./src/entities/addLiquidity/types.ts#L27) | Same input used in the corresponding add liquidity operation |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being added to |

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___
### addLiquidityUnbalanced

Calculate price impact on add liquidity unbalanced operations.

```typescript
addLiquidityUnbalanced = async (
    input: AddLiquidityUnbalancedInput,
    poolState: PoolState,
): Promise<PriceImpactAmount>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | AddLiquidityUnbalancedInput | Same input used in the corresponding add liquidity operation |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being added to |

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___
### addLiquidityNested

Calculate price impact on add liquidity nested token operations.

```typescript
addLiquidityNested = async (
  input: AddLiquidityNestedInput,
  nestedPoolState: NestedPoolState,
): Promise<PriceImpactAmount>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | AddLiquidityNestedInput | Same input used in the corresponding add liquidity operation |
| nestedPoolState | [NestedPoolState](./src/entities/types.ts#L43) | Current state of nested pools |

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___

### removeLiquidity

Calculate price impact on remove liquidity operations.

```typescript
removeLiquidity = async (
  input:
      | RemoveLiquiditySingleTokenExactInInput
      | RemoveLiquidityUnbalancedInput,
  poolState: PoolState,
): Promise<PriceImpactAmount>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [RemoveLiquiditySingleTokenExactInInput](./src/entities/removeLiquidity/types.ts#L35) | Same input used in the corresponding remove liquidity operation |
| input | [RemoveLiquidityUnbalancedInput](./src/entities/removeLiquidity/types.ts#L24) | Same input used in the corresponding remove liquidity operation |
| poolState | [PoolState](./src/entities/types.ts#L5) | Current state of pool that liqudity is being removed from |

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___

### removeLiquidityNested

Calculate price impact on remove liquidity single token nested operations.

```typescript
removeLiquidityNested = async (
  input: RemoveLiquidityNestedSingleTokenInput,
  nestedPoolState: NestedPoolState,
): Promise<PriceImpactAmount>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [RemoveLiquidityNestedSingleTokenInput](./src/entities/removeLiquidityNested/types.ts#L15) | Same input used in the corresponding remove liquidity operation |
| nestedPoolState | [NestedPoolState](./src/entities/types.ts#L43) | Current state of nested pools |

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___

### swap

Calculate price impact on swap operations.

```typescript
swap = async (
  swapInput: SwapInput,
  rpcUrl?: string,
  block?: bigint,
): Promise<PriceImpactAmount>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| swapInput | [SwapInput](./src/entities/swap/types.ts#L8) | Swap input including path information. |
| rpcUrl (optional) | string | RPC URL, e.g. Infura/Alchemy |
| block (optional) | bigint | Block no to perform the query |

Note: `SwapInput` data is normally returned from an API SOR query but may be constructed manually.

**Returns**

```typescript
Promise<PriceImpactAmount>
```

[PriceImpactAmount](./src/entities/priceImpactAmount.ts) - Price impact for operation.
___

## BalancerApi

This class provides helper functions for interacting with the Balancer API.

### Example

See the examples for add/remove/swap linked above as these use BalancerApi to fetch required data.

### Constructor

```typescript
const balancerApi = new BalancerApi(balancerApiUrl: string, chainId: ChainId);
```

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| balancerApiUrl | string | Url of Balancer API |
| chainId | [ChainId](./src/utils/constants.ts#L54) | Chain that will be queried |

### Methods

### pools.fetchPoolState

Finds state of given pool.

```typescript
pools.fetchPoolState(id: string): Promise<PoolState> 
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| id | string | ID of pool, V2=poolId, V3=address |

**Returns**

```typescript
Promise<PoolState>
```

[PoolState](./src/entities/types.ts#L5) - State of given pool.
___

### pools.fetchPoolStateWithBalances

Finds state of given pool including token balances and pool shares.

```typescript
fetchPoolStateWithBalances(
  id: string,
): Promise<PoolStateWithBalances> 
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| id | string | ID of pool, V2=poolId, V3=address |

**Returns**

```typescript
Promise<PoolStateWithBalances>
```

[PoolStateWithBalances](./src/entities/types.ts#L13) - State of given pool including token balances and pool shares.
___

### nestedPools.fetchPoolState

Finds state of a set of nested pools.

```typescript
fetchNestedPoolState(id: string): Promise<NestedPoolState>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| id | string | ID of pool, V2=poolId, V3=address |

**Returns**

```typescript
Promise<NestedPoolState>
```

[NestedPoolState](./src/entities/types.ts#L43) - state of a set of nested pools.
___
### sorSwapPaths.fetchSorSwapPaths

Finds optimised swap paths for a given swap config.

```typescript
fetchSorSwapPaths(sorInput: SorInput): Promise<Path[]>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| sorInput | [SorInput](./src/data/providers/balancer-api/modules/sorSwapPaths/index.ts#L8) | Swap configs |

**Returns**

```typescript
Promise<Path[]>
```

[Path[]](./src/entities/swap/paths/types.ts#L6) - optimised swap paths for the given swap.
___

## Utils

Helper functions.

### calculateProportionalAmounts

Given pool balances (including BPT) and a reference token amount, it calculates all other amounts proportional to the reference amount.

**Example**

See [calculateProportionalAmounts example](/examples/utils/calculateProportionalAmounts.ts).

**Function**

```typescript
calculateProportionalAmounts(
  pool: {
    address: Address;
    totalShares: HumanAmount;
    tokens: { 
      address: Address; 
      balance: HumanAmount; 
      decimals: number 
    }[];
  },
  referenceAmount: InputAmount,
): {
  tokenAmounts: InputAmount[];
  bptAmount: InputAmount;
}
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| pool | See above | Pool state |
| referenceAmount | [InputAmount](./src/types.ts#L43) | Ref token amount |

**Returns**

```typescript
{
  tokenAmounts: InputAmount[];
  bptAmount: InputAmount;
}
```

Amounts proportional to the reference amount.
___

### Permit2 Helper

Facilitate Permit2 signature generation. Each operation (e.g. addLiquidity, removeLiquidity, swap, ...) has its own helper that leverages the same input type of the operation itself in order to simplify signature generation.

**Example**

See [addLiquidityWithPermit2Signature example](/examples/addLiquidity/addLiquidityWithPermit2Signature.ts).

**Function**

Helper function to create a Permit2 signature for an addLiquidity operation:

```typescript
static async signAddLiquidityApproval(
        input: AddLiquidityBaseBuildCallInput & {
            client: PublicWalletClient;
            owner: Address;
            nonces?: number[];
            expirations?: number[];
        },
    ): Promise<Permit2>
```

**Parameters**

| Name               | Type          | Description   |
| -------------      | ------------- | ------------  |
| input | [AddLiquidityBaseBuildCallInput](./src/entities/addLiquidity/types.ts#L62) | Add Liquidity Input |
| client | [PublicWalletClient](./src/utils/types.ts#L3) | Viem's wallet client with public actions |
| owner | Address | User address |
| nonces (optional) | number[] | Nonces for each token |
| expirations (optional) | number[] | Expirations for each token |

**Returns**

```typescript
Promise<Permit2>;
```

[Permit2](./src/entities/permit2Helper/index.ts#L35) - Permit2 object with metadata and encoded signature

___