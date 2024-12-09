// pnpm test -- v3/utils/getPoolStateWithBalancesV3.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Hex,
    PoolState,
    ChainId,
    PoolType,
    getPoolStateWithBalancesV3,
    PoolStateWithBalances,
} from '@/index';
import { POOLS, TOKENS } from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;

const poolId = POOLS[chainId].MOCK_USDC_DAI_POOL.id;
const USDC = TOKENS[chainId].USDC;
const DAI = TOKENS[chainId].DAI;

// TODO: rewrite this as a unit test to avoid the need for updating hardcoded values
describe('add liquidity test', () => {
    let poolState: PoolState;
    let rpcUrl: string;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));
    });

    describe('getPoolStateWithBalancesV3', () => {
        test('<18 decimals tokens', async () => {
            const poolStateWithBalances = await getPoolStateWithBalancesV3(
                poolState,
                chainId,
                rpcUrl,
            );

            const mockData: PoolStateWithBalances = {
                ...poolState,
                tokens: [
                    {
                        address: USDC.address,
                        decimals: USDC.decimals,
                        index: 0,
                        balance: '4982.377088',
                    },
                    {
                        address: DAI.address,
                        decimals: DAI.decimals,
                        index: 1,
                        balance: '4412.573626596067233661',
                    },
                ],
                totalShares: '4685.71985547775593574',
            };

            expect(poolStateWithBalances).to.deep.eq(mockData);
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/
class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: USDC.address,
                decimals: USDC.decimals,
                index: 0,
            },
            {
                address: DAI.address,
                decimals: DAI.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Weighted,
            tokens,
            protocolVersion,
        };
    }
}

/******************************************************************************/
