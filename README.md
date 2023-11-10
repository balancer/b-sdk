# SDK

WIP upgrade of the SDK. Not meant for production usage yet and interfaces may have frequent breaking changes until a stable release.

## Setup

`pnpm install`

### Requirements

- `fetch`

### Polyfill

If your platform does not support one of the required features, it is also possible to import a polyfill.

- `fetch` -> [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

## Testing

Testing requires access to an archive node for onchain quote comparisons. This can be done using Infura.

`pnpm test`

## Balancer Api Provider

The Balancer API Provider is a provider that facilitates 
data fetching from the Balancer API,
it can be used for:
- Fetch Pool State for Joins;
- Fetch Pool State for Exits.

### Usage for Joining Pool

```ts
  import { BalancerApi, PoolJoin } from "@balancer/sdk";
    ...
    const joinInput: ProportionalJoinInput = {
      bptOut,
      chainId,
      rpcUrl,
      kind: AddLiquidityKind.Proportional,
    };

    const balancerApi = new BalancerApi('https://backend-v3-canary.beets-ftm-node.com/graphql', 1);
    const poolState = await balancerApi.pools.fetchPoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
    const poolJoin = new PoolJoin();
    const queryResult = await poolJoin.query(joinInput, poolState);
    const { call, to, value, maxAmountsIn, minBptOut } =
        poolJoin.buildCall({
            ...queryResult,
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
Full working join example: [examples/join/weighted.ts](./examples/join/weighted.ts)

### Usage for Exiting Pool
```ts
import { BalancerApi, PoolExit } from "@balancer/sdk";
...
const exitInput: SingleAssetExitInput = {
  chainId,
  rpcUrl,
  bptIn,
  tokenOut,
  kind: ExitKind.SingleAsset,
};

const balancerApi = new BalancerApi('https://backend-v3-canary.beets-ftm-node.com/graphql', 1);
const poolState = await balancerApi.pools.fetchPoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
const poolExit = new PoolExit();
const queryResult = await poolExit.query(exitInput, poolState);
const { call, to, value, maxAmountsIn, minBptOut } =
  poolExit.buildCall({
    ...queryResult,
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
Full working exit example: [examples/exit/weighted.ts](./examples/exit/weighted.ts)

## Anvil client
To download and install the anvil client, run the following commands (MacOS):
- `curl -L https://foundry.paradigm.xyz | bash`
- `brew install libusb`
- `source /Users/$(whoami)/.zshenv`
- `foundryup`

For other SO's check https://book.getfoundry.sh/getting-started/installation
```
