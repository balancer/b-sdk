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
    RemoveLiquidity,
    Hex,
    CHAINS,
    ChainId,
    InputAmount,
    RemoveLiquidityRecoveryInput,
    PoolStateWithBalances,
    HumanAmount,
} from 'src';

import {
    assertRemoveLiquidityRecovery,
    forkSetup,
    POOLS,
    RemoveLiquidityRecoveryTxInput,
    TOKENS,
} from 'test/lib/utils';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { doRemoveLiquidityRecovery } from 'test/lib/utils/removeLiquidityRecoveryHelper';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

const testPool = POOLS[chainId].DAI_WMATIC;
const DAI = TOKENS[chainId].DAI;
const WMATIC = TOKENS[chainId].WMATIC;

describe('weighted remove liquidity recovery test', () => {
    let txInput: RemoveLiquidityRecoveryTxInput;
    let poolStateWithBalances: PoolStateWithBalances;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolStateWithBalances = await api.getPoolWithBalances(testPool.id);

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
            [txInput.poolStateWithBalances.address],
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
                2,
                wethIsEth,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPoolWithBalances(id: Hex): Promise<PoolStateWithBalances> {
        const tokens = [
            {
                address: WMATIC.address,
                decimals: WMATIC.decimals,
                index: 0,
                symbol: 'WMATIC',
                name: 'WMATIC',
                balance: '3.061351040680712624' as HumanAmount,
            },
            {
                address: DAI.address,
                decimals: DAI.decimals,
                index: 1,
                symbol: 'DAI',
                name: 'DAI',
                balance: '2.030340444339934752' as HumanAmount,
            },
        ];
        return {
            id,
            address: testPool.address,
            type: testPool.type,
            tokens,
            totalShares: '4.978228468641314918' as HumanAmount,
            vaultVersion: 2,
        };
    }
}

/******************************************************************************/
