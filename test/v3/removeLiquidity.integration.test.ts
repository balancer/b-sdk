// pnpm test -- removeLiquidity.integration.test.ts
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityKind,
    Slippage,
    PoolState,
    RemoveLiquidity,
    Hex,
    CHAINS,
    ChainId,
    RemoveLiquidityInput,
    InputAmount,
    PoolType,
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    RemoveLiquiditySingleTokenExactOutInput,
    RemoveLiquidityUnbalancedInput,
    removeLiquidityUnbalancedNotSupportedOnV3,
} from '../../src';
import { approveToken, forkSetup } from '../lib/utils/helper';
import {
    assertRemoveLiquidityProportional,
    assertRemoveLiquiditySingleTokenExactIn,
    assertRemoveLiquiditySingleTokenExactOut,
    doRemoveLiquidity,
} from '../lib/utils/removeLiquidityHelper';
import {
    AddLiquidityTxInput,
    RemoveLiquidityTxInput,
} from '../lib/utils/types';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import { doAddLiquidity } from 'test/lib/utils/addLiquidityHelper';

const vaultVersion = 3;

const chainId = ChainId.SEPOLIA;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;

const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

describe('remove liquidity test', () => {
    let prepTxInput: AddLiquidityTxInput;
    let txInput: RemoveLiquidityTxInput;
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

        const testAddress = (await client.getAddresses())[0];

        const addLiquidityInput: AddLiquidityUnbalancedInput = {
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: poolState.tokens.map((t) => {
                return {
                    rawAmount: parseUnits('10', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                };
            }),
        };

        prepTxInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput,
        };

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
        // setup by performing an add liquidity so it's possible to remove after that
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolState.tokens.map((t) => t.address)],
            [WETH.slot, BAL.slot] as number[],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
            undefined,
            vaultVersion,
        );

        await approveToken(
            txInput.client,
            txInput.testAddress,
            txInput.poolState.address,
            vaultVersion,
        );

        await doAddLiquidity(prepTxInput);
    });

    describe('unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolState.tokens.map((t) => ({
                rawAmount: parseUnits('1', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Unbalanced,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            const removeLiquidityInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
            ).rejects.toThrowError(removeLiquidityUnbalancedNotSupportedOnV3);
        });
    });

    describe('single token exact out', () => {
        let input: RemoveLiquiditySingleTokenExactOutInput;
        beforeAll(() => {
            const amountOut: InputAmount = {
                rawAmount: parseUnits('1', WETH.decimals),
                decimals: WETH.decimals,
                address: WETH.address,
            };
            input = {
                chainId,
                rpcUrl,
                amountOut,
                kind: RemoveLiquidityKind.SingleTokenExactOut,
            };
        });
        test('with wrapped', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquiditySingleTokenExactOut(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
            );
        });

        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
                wethIsEth,
            });

            assertRemoveLiquiditySingleTokenExactOut(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
                wethIsEth,
            );
        });
    });

    describe('single token exact in', () => {
        let input: RemoveLiquiditySingleTokenExactInInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            const tokenOut = WETH.address;
            input = {
                chainId,
                rpcUrl,
                bptIn,
                tokenOut,
                kind: RemoveLiquidityKind.SingleTokenExactIn,
            };
        });
        test('with wrapped', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquiditySingleTokenExactIn(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
            );
        });

        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
                wethIsEth,
            });

            assertRemoveLiquiditySingleTokenExactIn(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
                wethIsEth,
            );
        });
    });

    describe('proportional', () => {
        let input: RemoveLiquidityProportionalInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquidityProportional(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
            );
        });
        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
                wethIsEth,
            });
            assertRemoveLiquidityProportional(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                vaultVersion,
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
                address: WETH.address,
                decimals: WETH.decimals,
                index: 0,
            },
            {
                address: BAL.address,
                decimals: BAL.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Weighted,
            tokens,
            vaultVersion,
        };
    }
}

/******************************************************************************/
