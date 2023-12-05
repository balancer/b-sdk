import {
    Address,
    Hex,
    PublicClient,
    createPublicClient,
    getContract,
    http,
} from 'viem';
import { CHAINS } from '../../utils';
import { InputAmount } from '../../types';
import { PoolStateInput } from '../../entities';
import { CreatePoolInput } from '../../entities/createPool/types';

export class AddLiquidityInitPoolDataProvider {
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

    public async getAddLiquidityInitPoolData(
        poolAddress: Address,
        poolType: string,
        amounts: InputAmount[],
        input: CreatePoolInput,
    ): Promise<PoolStateInput> {
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            publicClient: this.client,
        });

        const poolId = (await poolContract.read.getPoolId()) as Hex;
        return {
            id: poolId,
            address: poolAddress,
            type: poolType.toUpperCase(),
            tokens: amounts
                .sort((a, b) => {
                    return BigInt(a.address) - BigInt(b.address);
                })
                .map(({ address, decimals }, index) => ({
                    address,
                    decimals,
                    index,
                    weight: input.tokens.find((t) => t.tokenAddress === address)
                        ?.weight,
                })),
        };
    }
}
