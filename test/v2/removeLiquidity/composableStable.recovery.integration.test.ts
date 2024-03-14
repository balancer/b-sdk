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
    HumanAmount,
    InputAmount,
    PoolStateWithBalances,
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
    let poolStateWithBalances: PoolStateWithBalances;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolStateWithBalances = await api.getPoolWithBalances();

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
            poolStateWithBalances,
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
                address: poolStateWithBalances.address,
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
                txInput.poolStateWithBalances,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                poolStateWithBalances.vaultVersion,
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
                txInput.poolStateWithBalances,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                poolStateWithBalances.vaultVersion,
                wethIsEth,
            );
        });
    });
});

class MockApi {
    public async getPoolWithBalances(): Promise<PoolStateWithBalances> {
        const tokens = [
            {
                address: testPool.address,
                decimals: testPool.decimals,
                index: 0,
                name: 'vETH_wETH',
                symbol: 'vETH_wETH',
                balance: '2596148429267413.794052669613761796' as HumanAmount,
            },
            {
                address: TOKENS_MAINNET.vETH.address,
                decimals: TOKENS_MAINNET.vETH.decimals,
                index: 1,
                name: 'vETH',
                symbol: 'vETH',
                balance: '1.045187143371175654' as HumanAmount,
            },
            {
                address: TOKENS_MAINNET.WETH.address,
                decimals: TOKENS_MAINNET.WETH.decimals,
                index: 2,
                name: 'WETH',
                symbol: 'WETH',
                balance: '0.813652579142753934' as HumanAmount,
            },
        ];

        return {
            id: testPool.id,
            address: testPool.address,
            type: testPool.type,
            tokens,
            totalShares: '1.879969119336134102' as HumanAmount,
            vaultVersion: 2,
        };
    }
}
