import {
    Address,
    Hex,
    PublicClient,
    createPublicClient,
    getContract,
    http,
} from 'viem';
import { CHAINS } from '../../utils';
import { InputAmountInit, PoolType } from '../../types';
import { PoolStateInput } from '../../entities';
import { sortTokensByAddress } from '../../utils/tokens';

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
        poolType: PoolType,
        amounts: InputAmountInit[],
    ): Promise<PoolStateInput> {
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            publicClient: this.client,
        });

        const poolTokens = amounts.map(({ address, decimals }, index) => ({
            address: address.toLowerCase() as Address,
            decimals,
            index: index + 1,
        }));

        const poolTokensWithBpt = sortTokensByAddress([
            {
                address: poolAddress.toLowerCase() as Address,
                decimals: 18,
                index: 0,
            },
            ...poolTokens,
        ]);

        const tokensPerPoolType = {
            [PoolType.Weighted]: poolTokens,
            [PoolType.ComposableStable]: poolTokensWithBpt,
        };

        try {
            const poolId = (await poolContract.read.getPoolId()) as Hex;
            return {
                id: poolId,
                address: poolAddress.toLowerCase() as Address,
                type: poolType,
                tokens: tokensPerPoolType[poolType],
            };
        } catch (e) {
            console.warn(e);
            throw new Error(
                'Invalid address, not possible to retrieve Pool Id',
            );
        }
    }
}
