// pnpm test -- removeLiquidity/weighted.recovery.integration.test.ts
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
} from 'src';

import {
    assertRemoveLiquidityRecovery,
    doRemoveLiquidity,
    forkSetup,
    POOLS,
    RemoveLiquidityTxInput,
    TOKENS,
} from 'test/lib/utils';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

const testPool = POOLS[chainId].DAI_WMATIC;
const DAI = TOKENS[chainId].DAI;
const WMATIC = TOKENS[chainId].WMATIC;

describe('weighted remove liquidity recovery test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolInput: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolInput = await api.getPool(testPool.id);

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
            poolState: poolInput,
            testAddress,
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolState.address],
            [testPool.slot as number],
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
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
                wethIsEth,
            });

            assertRemoveLiquidityRecovery(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                wethIsEth,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: WMATIC.address,
                decimals: WMATIC.decimals,
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
            address: testPool.address,
            type: testPool.type,
            tokens,
            vaultVersion: 2,
        };
    }
}

/******************************************************************************/
