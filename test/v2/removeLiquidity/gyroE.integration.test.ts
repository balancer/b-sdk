// pnpm test -- removeLiquidity/gyroE.integration.test.ts
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
} from '../../../src';
import { forkSetup } from '../../lib/utils/helper';
import {
    assertRemoveLiquidityProportional,
    doRemoveLiquidity,
} from '../../lib/utils/removeLiquidityHelper';
import { RemoveLiquidityTxInput } from '../../lib/utils/types';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { InputValidatorGyro } from '../../../src/entities/inputValidator/gyro/inputValidatorGyro';
import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);
const poolId =
    '0x97469e6236bd467cd147065f77752b00efadce8a0002000000000000000008c0'; // ECLP-TUSD-USDC

const USDC = TOKENS[chainId].USDC;

describe('GyroE V1 remove liquidity test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolInput: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolInput = await api.getPool(poolId);

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
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolInput.address,
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
                txInput.client.chain?.id as number,
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
        //Removed test with native, because there are no GyroE V1 pool with wrapped native asset in any network
    });

    describe('unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolInput.tokens.map((t) => ({
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
            ).rejects.toThrowError(
                InputValidatorGyro.removeLiquidityKindNotSupportedByGyro,
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
                InputValidatorGyro.removeLiquidityKindNotSupportedByGyro,
            );
        });
    });

    describe('single token exact in', () => {
        let input: RemoveLiquiditySingleTokenExactInInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolInput.address,
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
                InputValidatorGyro.removeLiquidityKindNotSupportedByGyro,
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
            type: PoolType.GyroE,
            tokens: [
                {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
                    decimals: 6,
                    index: 0,
                },
                {
                    address: '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756', // TUSD
                    decimals: 18,
                    index: 1,
                },
            ],
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
