import {
    Address,
    PublicClient,
    createPublicClient,
    http,
    parseAbi,
} from 'viem';
import { PoolState } from '@/entities';
import { CHAINS, VAULT_V3 } from '@/utils';
import { vaultExtensionV3Abi } from '@/abi';

export class Pools {
    client: PublicClient;
    constructor(
        public rpcUrl: string,
        public chainId: number,
    ) {
        this.client = createPublicClient({
            transport: http(this.rpcUrl),
            chain: CHAINS[this.chainId],
        });
    }

    async fetchPoolState(id: Address, poolType: string): Promise<PoolState> {
        // First call fetches pool tokens from vault
        const poolTokens = await this.client.readContract({
            address: VAULT_V3[this.chainId],
            abi: vaultExtensionV3Abi,
            functionName: 'getPoolTokens',
            args: [id],
        });

        // Multicall to fetch token decimals
        const decimalCalls = poolTokens.map((t) => {
            return {
                address: t as Address,
                abi: parseAbi([
                    'function decimals() external view returns (uint8)',
                ]),
                functionName: 'decimals',
            } as const;
        });

        const decimals = await this.client.multicall({
            contracts: decimalCalls,
            allowFailure: false,
        });

        const poolState: PoolState = {
            id,
            address: id,
            type: poolType,
            protocolVersion: 3,
            tokens: poolTokens.map((t, i) => {
                return {
                    index: i,
                    address: t,
                    decimals: decimals[i],
                };
            }),
        };

        return poolState;
    }
}

export class OnChainProvider {
    pools: Pools;
    constructor(rpcUrl: string, chainId: number) {
        this.pools = new Pools(rpcUrl, chainId);
    }
}
