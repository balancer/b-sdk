// pnpm test -- addLiquidityComposableStable.integration.test.ts
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
    parseEther,
} from 'viem';

import {
    AddLiquidityUnbalancedInput,
    AddLiquidityProportionalInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityKind,
    Slippage,
    Address,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    getPoolAddress,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
} from '../../../src';
import { forkSetup } from '../../lib/utils/helper';
import { AddLiquidityTxInput } from '../../lib/utils/types';
import {
    doAddLiquidity,
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
    assertAddLiquidityProportional,
} from '../../lib/utils/addLiquidityHelper';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // Balancer vETH/WETH StablePool

describe('add liquidity composable stable test', () => {
    let txInput: AddLiquidityTxInput;
    let poolStateInput: PoolStateInput;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolStateInput = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolStateInput: poolStateInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            addLiquidityInput: {} as AddLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolStateInput.tokens.map((t) => t.address)],
            [0, 0, 3],
            [
                ...txInput.poolStateInput.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
        );
    });

    describe('add liquidity unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            const bptIndex = txInput.poolStateInput.tokens.findIndex(
                (t) => t.address === txInput.poolStateInput.address,
            );
            amountsIn = txInput.poolStateInput.tokens
                .map((t) => ({
                    rawAmount: parseUnits('1', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                }))
                .filter((_, index) => index !== bptIndex);
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
            };
        });
        test('token inputs', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });
            assertAddLiquidityUnbalanced(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });
            assertAddLiquidityUnbalanced(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('add liquidity single asset', () => {
        let input: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolStateInput.address,
            };
            const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
            input = {
                bptOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleToken,
            };
        });
        test('with token', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: input,
            });

            assertAddLiquiditySingleToken(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                addLiquidityOutput,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const addLiquidityInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });

            assertAddLiquiditySingleToken(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('add liquidity proportional', () => {
        let input: AddLiquidityProportionalInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolStateInput.address,
            };
            input = {
                bptOut,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: input,
            });

            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const addLiquidityInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });
            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        const tokens = [
            {
                address:
                    '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76' as Address, // vETH/WETH BPT
                decimals: 18,
                index: 0,
            },
            {
                address:
                    '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f' as Address, // VETH
                decimals: 18,
                index: 1,
            },
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 2,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'PHANTOM_STABLE',
            tokens,
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
