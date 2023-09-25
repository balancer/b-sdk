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

## Examples

### Balancer Api Provider

Joining with pool state:
```ts
  import BalancerApi from "@balancer/sdk/data/providers/balancer-api";
    ...
    const joinInput: ProportionalJoinInput = {
      bptOut,
      chainId,
      rpcUrl,
      kind: JoinKind.Proportional,
    };

    const balancerApi = new BalancerApi('https://api-v3.balancer.fi/', 1);
    const poolState = await balancerApi.pools.fetchSimplePoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
    const joinParser = new JoinParser();
    const poolJoin = joinParser.getJoin(poolState.type);
    const queryResult = await weightedJoin.query(joinInput, poolState);

```

Exiting with pool state:
```ts
import BalancerApi from "@balancer/sdk/data/providers/balancer-api";
...
const joinInput: ProportionalJoinInput = {
  bptOut,
  chainId,
  rpcUrl,
  kind: JoinKind.Proportional,
};

const balancerApi = new BalancerApi('https://api-v3.balancer.fi/', 1);
const poolState = await balancerApi.pools.fetchSimplePoolState('0x5f1d6874cb1e7156e79a7563d2b61c6cbce03150000200000000000000000586');
const joinParser = new JoinParser();
const poolJoin = joinParser.getJoin(poolState.type);
const queryResult = await weightedJoin.query(joinInput, poolState);
const slippage = Slippage.fromPercentage('1'); // 1%
const { call, to, value, maxAmountsIn, minBptOut } =
  weightedJoin.buildCall({
    ...queryResult,
    slippage,
    sender,
    recipient,
  });
const client = createClient({
  ...
})

await client.sendTransaction({
  account,
  chain: client.chain,
  data,
  to,
  value,
});
```