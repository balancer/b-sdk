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
import { PoolState } from '../../entities';
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
    ): Promise<PoolState> {
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            client: this.client,
        });

        const poolTokens = sortTokensByAddress(amounts).map(
            ({ address, decimals }, index) => ({
                address: address.toLowerCase() as Address,
                decimals,
                index,
            }),
        );

        const poolTokensWithBpt = sortTokensByAddress([
            ...amounts,
            { address: poolAddress.toLowerCase() as Address, decimals: 18 },
        ]).map(({ address, decimals }, index) => ({
            address: address.toLowerCase() as Address,
            decimals,
            index,
        }));

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
                balancerVersion: 2, // TODO V3: instantiate a different provider for V3? Or add a config/input to this one? Will the interface be the same?
            };
        } catch (e) {
            console.warn(e);
            throw new Error(
                'Invalid address, not possible to retrieve Pool Id',
            );
        }
    }
}
