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
import { vaultAbi } from '@/abi';

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
    ): Promise<PoolState> {
        const chainId = await this.client.getChainId();
        const poolContract = getContract({
            abi: this.simplePoolAbi,
            address: poolAddress,
            client: this.client,
        });

        const vaultContract = getContract({
            abi: vaultAbi,
            address: VAULT[chainId],
            publicClient: this.client,
        });

        try {
            const poolId = (await poolContract.read.getPoolId()) as Hex;
            const poolTokensFromVault = await vaultContract.read.getPoolTokens([
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
