// pnpm test -- removeLiquidity/weighted.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    RemoveLiquidityKind,
    Slippage,
    PoolState,
    RemoveLiquidity,
    Hex,
    CHAINS,
    ChainId,
    RemoveLiquidityInput,
    InputAmount,
    RemoveLiquidityRecoveryInput,
} from '../../../src';
import { forkSetup } from '../../lib/utils/helper';
import {
    assertRemoveLiquidityRecovery,
    doRemoveLiquidity,
} from '../../lib/utils/removeLiquidityHelper';
import { RemoveLiquidityTxInput } from '../../lib/utils/types';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

const POOLS_MAINNET = POOLS[chainId];
const TOKENS_MAINNET = TOKENS[chainId];
describe('weighted remove liquidity recovery test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolInput: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolInput = await api.getPool(
            POOLS_MAINNET['50bb_sDAI_50bb_a_USDC'].id,
        );

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState: poolInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolState.address],
            [POOLS_MAINNET['50bb_sDAI_50bb_a_USDC'].slot as number],
            [parseUnits('1000', 18)],
        );
    });

    describe('remove liquidity recovery', () => {
        let input: RemoveLiquidityRecoveryInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolInput.address,
            };
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Recovery,
            };
        });
        test('with tokens', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquidityRecovery(
                txInput.client.chain?.id as number,
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                ...TOKENS_MAINNET.bb_s_DAI,
                index: 0,
            },
            {
                ...TOKENS_MAINNET.bb_a_USDC,
                index: 1,
            },
        ];
        return {
            ...POOLS_MAINNET['50bb_sDAI_50bb_a_USDC'],
            id,
            tokens,
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
