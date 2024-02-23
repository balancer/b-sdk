# SDK

INTRODUCTION TEXT

# Setup
In order to install SDK dependencies, you need to run the command:

- `pnpm install`

## Requirements

- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch): b-sdk uses native Fetch API, if your platform cannot support Fetch API, you can also use a polyfill.

### Using node-fetch polyfill

If your platform does not support native fetch, it is also possible to import a polyfill.

- `fetch` -> [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

### Requirements to run tests and examples

**Foundry**

 The SDK tests and examples runs using anvil nodes, which are part of the Foundry Toolchain, if you don't have foundry installed in your environment.

To download and install the anvil client, run the following commands (MacOS):
- `curl -L https://foundry.paradigm.xyz | bash`
- `brew install libusb`
- `source /Users/$(whoami)/.zshenv`
- `foundryup`

For other SO's check https://book.getfoundry.sh/getting-started/installation

- <b>NodeJS</b>: The recommended version is 18 or greater.

## Testing
You can test all files with the command:

- `pnpm test`

Or a specific file:
- `pnpm test ./test/v2/initPool/composableStable.integration.test.ts`

### Configuring RPC's

Testing requires access to an archive node for onchain quote comparisons. This can be done using Infura.
#### RPC Environment variables


# Modules

## Add Liquidity

## Add Liquidity Nested

## Remove Liquidity

## Remove Liquidity Nested

## Swap

## Create Pool

## Initialize Pool

# Data Providers and Abi's


## Balancer Api Provider

The Balancer API Provider is a provider that facilitates 
data fetching from the Balancer API,
it can be used for:
- Fetch Pool State for AddLiquidity;
- Fetch Pool State for RemoveLiquidity.

### Usage for adding liquidity to a Pool

```ts
  import { BalancerApi, AddLiquidity } from "@balancer/sdk";
    ...
    const addLiquidityInput: AddLiquidityProportionalInput = {
      bptOut,
      chainId,
      rpcUrl,
      kind: AddLiquidityKind.Proportional,
    };

    const balancerApi = new BalancerApi('https://backend-v3-canary.beets-ftm-node.com/graphql', 1);
    const poolState = await balancerApi.pools.fetchPoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
    const addLiquidity = new AddLiquidity();
    const queryOutput = await addLiquidity.query(addLiquidityInput, poolState);
    const { call, to, value, maxAmountsIn, minBptOut } =
        addLiquidity.buildCall({
            ...queryOutput,
            slippage,
            sender: signerAddress,
            recipient: signerAddress,
        });
    const client = createClient({
      ...
    })
    
    await client.sendTransaction({
      account: signerAddress,
      chain: client.chain,
      data: call,
      to,
      value,
    });
```
Full working add liquidity example: [examples/addLiquidity.ts](./examples/addLiquidity.ts)

### Usage for removing liquidity from a Pool
```ts
import { BalancerApi, RemoveLiquidity } from "@balancer/sdk";
...
const removeLiquidityInput: RemoveLiquiditySingleTokenExactInInput = {
  chainId,
  rpcUrl,
  bptIn,
  tokenOut,
  kind: RemoveLiquidityKind.SingleTokenExactIn,
};

const balancerApi = new BalancerApi('https://backend-v3-canary.beets-ftm-node.com/graphql', 1);
const poolState = await balancerApi.pools.fetchPoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
const removeLiquidity = new RemoveLiquidity();
const queryOutput = await removeLiquidity.query(removeLiquidityInput, poolState);
const { call, to, value, maxAmountsIn, minBptOut } =
  removeLiquidity.buildCall({
    ...queryOutput,
    slippage,
    sender: signerAddress,
    recipient: signerAddress,
  });
const client = createClient({
  ...
})

await client.sendTransaction({
  account: signerAddress,
  chain: client.chain,
  data: call,
  to,
  value,
});
```
Full working remove liquidity example: [examples/removeLiquidity.ts](./examples/removeLiquidity.ts)

## Pool Creation And Initialization
Pool Creation functionality is available for the latest versions of Weighted Pools (V4) and Composable Stable Pools (V5).
For usage of Pool Creation check our examples:
- Weighted Pool Creation (V4)[examples/createPoolWeighted.ts](./examples/createPoolWeighted.ts)
- Composable Stable Pool Creation (V5)[examples/createPoolComposableStable.ts](./examples/createPoolComposableStable.ts)

For usage of Pool Initialization check our example:
- Pool Initialization [examples/createPoolComposableStable.ts](./examples/initPool.ts)






