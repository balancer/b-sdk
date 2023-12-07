import {
    Address,
    Hex,
    PublicClient,
    createPublicClient,
    getContract,
    http,
} from 'viem';
import { CHAINS } from '../../utils';
import { InputAmountInit } from '../../types';
import { PoolStateInput } from '../../entities';

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
        amounts: InputAmountInit[],
    ): Promise<PoolStateInput> {
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            publicClient: this.client,
        });
        try {
            const poolId = (await poolContract.read.getPoolId()) as Hex;
            return {
                id: poolId,
                address: poolAddress,
                type: poolType.toUpperCase(),
                tokens: amounts
                    .sort((a, b) => {
                        const diff = BigInt(a.address) - BigInt(b.address);
                        return diff > 0 ? 1 : diff < 0 ? -1 : 0;
                    })
                    .map(({ address, decimals }, index) => ({
                        address: address.toLowerCase() as Address,
                        decimals,
                        index,
                    })),
            };
        } catch (e) {
            console.warn(e);
            throw new Error(
                'Invalid address, not possible to retrieve Pool Id',
            );
        }
    }
}
