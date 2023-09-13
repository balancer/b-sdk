import { OnChainPoolDataViaMulticallEnricher } from '../src/data/enrichers/onChainPoolDataViaMulticallEnricher';
import { createPublicClient, http } from 'viem';
// rome-ignore lint/correctness/noUnusedVariables: <this is a test file>
import { mainnet, polygonZkEvm } from 'viem/chains';

const chain = polygonZkEvm;
const rpc = 'https://rpc.ankr.com/polygon_zkevm';

// rome-ignore lint/correctness/noUnusedVariables: <this is a test file>
const client = createPublicClient({
    chain,
    transport: http(),
});

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

const onChainEnricher = new OnChainPoolDataViaMulticallEnricher(chain.id, rpc);
const data = await onChainEnricher.fetchAdditionalPoolData(pools);
const enrichered = onChainEnricher.enrichPoolsWithData(pools.pools, data);

console.log(enrichered, data.length);
