// pnpm test -- composableStable.recovery.integration.test.ts

import {
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
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
    Slippage,
} from 'src';

import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import {
    assertRemoveLiquidityRecovery,
    doRemoveLiquidityRecovery,
    forkSetup,
    POOLS,
    RemoveLiquidityRecoveryTxInput,
    TOKENS,
} from 'test/lib/utils';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const TOKENS_MAINNET = TOKENS[chainId];
const testPool = POOLS[chainId].vETH_WETH;

describe('composable stable remove liquidity test', () => {
    let txInput: RemoveLiquidityRecoveryTxInput;
    let poolState: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool();

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
            removeLiquidityRecoveryInput: {} as RemoveLiquidityRecoveryInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [testPool.address],
            [testPool.slot as number],
            [parseUnits('10', 18)],
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
            const removeLiquidityOutput = await doRemoveLiquidityRecovery({
                ...txInput,
                removeLiquidityRecoveryInput: input,
            });

            assertRemoveLiquidityRecovery(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                poolState.vaultVersion,
            );
        });
        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityOutput = await doRemoveLiquidityRecovery({
                ...txInput,
                removeLiquidityRecoveryInput: input,
                wethIsEth,
            });

            assertRemoveLiquidityRecovery(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                poolState.vaultVersion,
                wethIsEth,
            );
        });
    });
});

class MockApi {
    public async getPool(): Promise<PoolState> {
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
            id: testPool.id,
            address: testPool.address,
            type: testPool.type,
            tokens,
            vaultVersion: 2,
        };
    }
}
