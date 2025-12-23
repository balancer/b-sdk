// pnpm test -- removeLiquidity/gyro3.integration.test.ts
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
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityKind,
    Slippage,
    PoolState,
    RemoveLiquidity,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    RemoveLiquidityInput,
    InputAmount,
    PoolType,
    RemoveLiquiditySingleTokenExactOutInput,
    poolTypeError,
} from '../../../src';
import {
    assertRemoveLiquidityProportional,
    doRemoveLiquidity,
    forkSetup,
    RemoveLiquidityTxInput,
    TOKENS,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);
const poolId =
    '0x17f1ef81707811ea15d9ee7c741179bbe2a63887000100000000000000000799'; // 3CLP-BUSD-USDC-USDT

const USDC = TOKENS[chainId].USDC;

describe.skip('Gyro3 remove liquidity test', () => {
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

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState: poolState,
            testAddress: '0xe84f75fc9caa49876d0ba18d309da4231d44e94d', // MATIC Holder Wallet, must hold amount of matic to approve tokens
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolState.address],
            [0],
            [parseUnits('1000', 18)],
        );
    });

    describe('proportional', () => {
        let input: RemoveLiquidityProportionalInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('0.01'),
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
                chainId,
            );
            //Removed test with native, because there are no GyroE V1 pool with wrapped native asset in any network
        });
    });

    describe('unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolState.tokens.map((t) => ({
                rawAmount: parseUnits('0.001', t.decimals),
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
            ).rejects.toThrowError(
                poolTypeError(
                    `Remove Liquidity ${removeLiquidityInput.kind}`,
                    poolState.type,
                    'Use Remove Liquidity Proportional',
                ),
            );
        });
    });

    describe('single token exact out', async () => {
        let input: Omit<RemoveLiquiditySingleTokenExactOutInput, 'amountOut'>;
        let amountOut: InputAmount;
        beforeAll(() => {
            amountOut = {
                rawAmount: parseUnits('0.001', USDC.decimals),
                decimals: USDC.decimals,
                address: USDC.address,
            };
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.SingleTokenExactOut,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            const removeLiquidityInput = {
                ...input,
                amountOut,
            };
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
            ).rejects.toThrowError(
                poolTypeError(
                    `Remove Liquidity ${removeLiquidityInput.kind}`,
                    poolState.type,
                    'Use Remove Liquidity Proportional',
                ),
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
            const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
            input = {
                chainId,
                rpcUrl,
                bptIn,
                tokenOut,
                kind: RemoveLiquidityKind.SingleTokenExactIn,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput: input }),
            ).rejects.toThrowError(
                poolTypeError(
                    `Remove Liquidity ${input.kind}`,
                    poolState.type,
                    'Use Remove Liquidity Proportional',
                ),
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.Gyro3,
            tokens: [
                {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC(PoS)
                    decimals: 6,
                    index: 0,
                },
                {
                    address: '0x9c9e5fd8bbc25984b178fdce6117defa39d2db39', // BUSD
                    decimals: 18,
                    index: 1,
                },
                {
                    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT(PoS)
                    decimals: 6,
                    index: 2,
                },
            ],
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
