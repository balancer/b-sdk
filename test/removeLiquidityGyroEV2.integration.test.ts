// pnpm test -- removeLiquidityGyroEV2.integration.test.ts
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
    RemoveLiquiditySingleTokenInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityKind,
    Slippage,
    PoolStateInput,
    RemoveLiquidity,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    RemoveLiquidityInput,
    InputAmount,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import {
    assertRemoveLiquidityProportional,
    doRemoveLiquidity,
} from './lib/utils/removeLiquidityHelper';
import { RemoveLiquidityTxInput } from './lib/utils/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { removeLiquidityKindNotSupportedByGyro } from '../src/entities/removeLiquidity/utils/validateInputs';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const poolId =
    '0xf01b0684c98cd7ada480bfdf6e43876422fa1fc10002000000000000000005de'; // ECLP-wstETH-wETH

describe('GyroE V2 remove liquidity test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolInput: PoolStateInput;
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
            poolStateInput: poolInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolStateInput.address],
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
                txInput.poolStateInput,
                input,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const removeLiquidityInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
            });
            assertRemoveLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolInput.tokens.map((t) => ({
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
            ).rejects.toThrowError(removeLiquidityKindNotSupportedByGyro);
        });
    });

    describe('single token', () => {
        let input: RemoveLiquiditySingleTokenInput;
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
                kind: RemoveLiquidityKind.SingleToken,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput: input }),
            ).rejects.toThrowError(removeLiquidityKindNotSupportedByGyro);
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/
export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'GYROE',
            tokens: [
                {
                    address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // wETH
                    decimals: 18,
                    index: 1,
                },
            ],
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
