import {
    Address,
    Hex,
    PublicClient,
    createPublicClient,
    getContract,
    http,
} from 'viem';
import { CHAINS, VAULT } from '../../utils';
import { PoolState } from '../../entities';
import { getTokenDecimals } from '../../utils/tokens';
import { vaultV2Abi } from '@/abi';

export class InitPoolDataProvider {
    private readonly client: PublicClient;

    private readonly simplePoolAbi = [
        {
            inputs: [],
            name: 'getPoolId',
            outputs: [
                {
                    internalType: 'bytes32',
                    name: '',
                    type: 'bytes32',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];

    constructor(
        private readonly chainId: number,
        private readonly rpcUrl: string,
    ) {
        this.client = createPublicClient({
            transport: http(this.rpcUrl, { timeout: 60_000 }),
            chain: CHAINS[this.chainId],
        });
    }

    public async getInitPoolData(
        poolAddress: Address,
        poolType: string,
        balancerVersion: 2 | 3,
        ): Promise<PoolState> {
            if(balancerVersion === 2){
                return this.getInitPoolDataV2(poolAddress, poolType);
            }
            return this.getInitPoolDataV3(poolAddress, poolType);
    }

    private async getInitPoolDataV2(poolAddress: Address, poolType: string): Promise<PoolState>{
        const chainId = await this.client.getChainId();
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            publicClient: this.client,
        });

        const vaultV2 = getContract({
            abi: vaultV2Abi,
            address: VAULT[chainId],
            publicClient: this.client,
        });

        try {
            const poolId = (await poolContract.read.getPoolId()) as Hex;
            const poolTokensFromVault = await vaultV2.read.getPoolTokens([
                poolId,
            ]);
            const poolTokens = await Promise.all(
                poolTokensFromVault[0].map(async (address, index) => {
                    const decimals = await getTokenDecimals(
                        address,
                        this.client,
                    );
                    return {
                        address: address.toLowerCase() as Address,
                        index,
                        decimals,
                    };
                }),
            );
            return {
                id: poolId,
                address: poolAddress.toLowerCase() as Address,
                type: poolType,
                tokens: poolTokens,
                balancerVersion: 2,
            };
        } catch (e) {
            console.warn(e);
            throw new Error(
                'Invalid pool address, not possible to retrieve Pool Id',
            );
        }
    }

    private async getInitPoolDataV3(poolAddress: Address, poolType: string): Promise<PoolState> {
        console.log(poolAddress, poolType);
        throw new Error('InitPoolData fetcher not implemented for Balancer V3 yet');
    }
}
