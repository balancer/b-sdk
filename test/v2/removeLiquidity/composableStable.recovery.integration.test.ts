import {
    PoolState,
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
    Slippage,
} from '@/entities';
import { CHAINS, ChainId } from '@/utils';
import { forkSetup } from 'test/lib/utils/helper';
import { RemoveLiquidityTxInput } from 'test/lib/utils/types';
import {
    Hex,
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { InputAmount } from '@/types';
import {
    doRemoveLiquidity,
    assertRemoveLiquidityRecovery,
} from 'test/lib/utils/removeLiquidityHelper';
import { test } from 'vitest';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const TOKENS_MAINNET = TOKENS[chainId];
const POOLS_MAINNET = POOLS[chainId];

describe('composable stable remove liquidity test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolInput: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolInput = await api.getPool(POOLS_MAINNET.swETH_bb_a_WETH_BPT.id);

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
            [POOLS_MAINNET.swETH_bb_a_WETH_BPT.slot as number],
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

export class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                ...TOKENS_MAINNET.swETH_bb_a_WETH_BPT,
                index: 0,
            },
            {
                ...TOKENS_MAINNET.bb_a_WETH,
                index: 1,
            },
            {
                ...TOKENS_MAINNET.swETH,
                index: 2,
            },
        ];

        return {
            ...POOLS[chainId].swETH_bb_a_WETH_BPT,
            id,
            tokens,
            balancerVersion: 2,
        };
    }
}
