// pnpm test -- addLiquidity/weighted.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

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
    PoolState,
    CHAINS,
    ChainId,
    getPoolAddress,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    PoolType,
} from '../../src';
import { forkSetup } from '../lib/utils/helper';
import {
    assertAddLiquidityProportional,
    assertAddLiquiditySingleToken,
    assertAddLiquidityUnbalanced,
    doAddLiquidity,
} from '../lib/utils/addLiquidityHelper';
import { AddLiquidityTxInput } from '../lib/utils/types';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x68e3266c9c8bbd44ad9dca5afbfe629022aee9fe000200000000000000000512'; // 80wjAURA-20WETH

describe('add liquidity weighted test', () => {
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

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
            poolState,
            testAddress: '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', // Balancer DAO Multisig
            addLiquidityInput: {} as AddLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [
                ...txInput.poolState.tokens.map((t) => t.address),
                txInput.poolState.address,
            ],
            [0, 3, 0],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
                parseUnits('100', 18),
            ],
        );
    });

    describe('add liquidity unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            amountsIn = txInput.poolState.tokens.map((t) => ({
                rawAmount: parseUnits('0.001', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
            };
        });
        test('with tokens', async () => {
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
                txInput.poolState,
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
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('add liquidity single asset', () => {
        let addLiquidityInput: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
            addLiquidityInput = {
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
                addLiquidityInput,
            });

            assertAddLiquiditySingleToken(
                txInput.client.chain?.id as number,
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });

            assertAddLiquiditySingleToken(
                txInput.client.chain?.id as number,
                txInput.poolState,
                {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('add liquidity proportional', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            addLiquidityInput = {
                bptOut,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });

            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });

            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolState,
                {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
                addLiquidityOutput,
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
                address:
                    '0x198d7387fa97a73f05b8578cdeff8f2a1f34cd1f' as Address, // wjAURA
                decimals: 18,
                index: 0,
            },
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 1,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.Weighted,
            tokens,
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
