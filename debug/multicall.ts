// bun run debug/multicall.ts
import {
    OnChainPoolDataEnricher,
    BATCHSIZE,
    ProviderSwapOptions,
    VAULT,
} from '../src';
// biome-ignore lint/correctness/noUnusedVariables: <this is a test file>
import { mainnet, polygonZkEvm } from 'viem/chains';

const chain = polygonZkEvm;
const rpc = 'https://rpc.ankr.com/polygon_zkevm';

const poolsQuery = `{
    pools(first: 10, orderBy: id, orderDirection: desc, where: { totalShares_gt: 0, poolType_contains: "ComposableStable" }) {
        id
        address
        poolType
        wrappedIndex
        tokens {
            address
            decimals
            index
        }
    }
}`;

const pools = await fetch(
    'https://api.studio.thegraph.com/query/24660/balancer-polygon-zk-v2/version/latest',
    // 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: poolsQuery }),
    },
)
    .then((res) => res.json())
    .then((res) => res.data);

const onChainEnricher = new OnChainPoolDataEnricher(
    chain.id,
    rpc,
    BATCHSIZE[chain.id],
    VAULT[chain.id],
);
// const blockNumber =
const providerOptions: ProviderSwapOptions = {
    // block: blockNumber,
    timestamp: BigInt(Date.now()),
};
const data = await onChainEnricher.fetchAdditionalPoolData(
    pools,
    providerOptions,
);
const enriched = onChainEnricher.enrichPoolsWithData(pools.pools, data);

console.log(enriched, data.length);
