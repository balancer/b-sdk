import {
    Address,
    Hex,
    PublicClient,
    createPublicClient,
    getContract,
    http,
} from 'viem';
import { CHAINS } from '../../utils';
import { PoolState } from '../../entities';
import {
    getPoolTokensV2,
    getPoolTokensV3,
    getTokenDecimals,
} from '../../utils/tokens';

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
        protocolVersion: 2 | 3,
    ): Promise<PoolState> {
        if (protocolVersion === 2) {
            return this.getInitPoolDataV2(poolAddress, poolType);
        }
        return this.getInitPoolDataV3(poolAddress, poolType);
    }

    private async getInitPoolDataV2(
        poolAddress: Address,
        poolType: string,
    ): Promise<PoolState> {
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            client: this.client,
        });

        const poolId = (await poolContract.read.getPoolId()) as Hex;
        const poolTokensFromVault = await getPoolTokensV2(poolId, this.client);
        const poolTokens = await Promise.all(
            poolTokensFromVault[0].map(async (address, index) => {
                const decimals = await getTokenDecimals(address, this.client);
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
            protocolVersion: 2,
        };
    }

    private async getInitPoolDataV3(
        poolAddress: Address,
        poolType: string,
    ): Promise<PoolState> {
        const poolTokensFromVault: Address[] = await getPoolTokensV3(
            poolAddress,
            this.client,
        );

        const poolTokens = await Promise.all(
            poolTokensFromVault.map(async (address, index) => {
                const decimals = await getTokenDecimals(address, this.client);
                return {
                    address: address.toLowerCase() as Address,
                    index,
                    decimals,
                };
            }),
        );
        return {
            id: poolAddress,
            address: poolAddress.toLowerCase() as Address,
            type: poolType,
            tokens: poolTokens,
            protocolVersion: 3,
        };
    }
}
