import { fetchAdditionalPoolData } from '../src/data/onChainPoolDataViaMulticall';
import { OnChainPoolDataViaMulticallEnricher } from '../src/data/enrichers/onChainPoolDataViaMulticallEnricher';
import { createPublicClient, http } from 'viem';
import { mainnet, polygonZkEvm } from 'viem/chains';

const client = createPublicClient({
    chain: mainnet,
    transport: http(),
});

const poolsQuery = `{
    pools(first: 10, orderBy: id, orderDirection: desc, where: { totalShares_gt: 0, poolType_contains: "Weighted" }) {
        id
        poolType
        wrappedIndex
        tokens {
            address
            decimals
            index
        }
    }
}`;

// 'https://api.studio.thegraph.com/query/24660/balancer-polygon-zk-v2/version/latest',
const pools = await fetch(
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
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

// const data = await fetchAdditionalPoolData(pools.pools, client);

const onChainEnricher = new OnChainPoolDataViaMulticallEnricher(1, '');
const data = await onChainEnricher.fetchAdditionalPoolData(pools);
const enrichered = onChainEnricher.enrichPoolsWithData(pools.pools, data);

console.log(enrichered, data.length);
