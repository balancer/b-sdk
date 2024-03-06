// pnpm test -- composableStable.recovery.integration.test.ts

import {
    Hex,
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';

import {
    CHAINS,
    ChainId,
    InputAmount,
    PoolState,
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
    Slippage,
} from 'src';

import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import {
    assertRemoveLiquidityRecovery,
    doRemoveLiquidity,
    forkSetup,
    POOLS,
    RemoveLiquidityTxInput,
    TOKENS,
} from 'test/lib/utils';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const TOKENS_MAINNET = TOKENS[chainId];
const testPool = POOLS[chainId].vETH_WETH;

describe('composable stable remove liquidity test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolState: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(testPool.id);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        const testAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [testPool.address],
            [testPool.slot as number],
            [parseUnits('1000', 18)],
        );
    });

    describe('remove liquidity recovery', () => {
        let input: RemoveLiquidityRecoveryInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('0.1'),
                decimals: 18,
                address: poolState.address,
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
        test('with native', async () => {
            const receiveNativeAsset = true;
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
                receiveNativeAsset,
            });

            assertRemoveLiquidityRecovery(
                txInput.client.chain?.id as number,
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                receiveNativeAsset,
            );
        });
    });
});

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: testPool.address,
                decimals: testPool.decimals,
                index: 0,
            },
            {
                address: TOKENS_MAINNET.vETH.address,
                decimals: TOKENS_MAINNET.vETH.decimals,
                index: 1,
            },
            {
                address: TOKENS_MAINNET.WETH.address,
                decimals: TOKENS_MAINNET.WETH.decimals,
                index: 2,
            },
        ];

        return {
            id,
            address: testPool.address,
            type: testPool.type,
            tokens,
            vaultVersion: 2,
        };
    }
}
