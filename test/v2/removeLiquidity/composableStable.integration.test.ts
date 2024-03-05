// pnpm test -- removeLiquidity/composableStable.integration.test.ts
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
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityKind,
    Slippage,
    Token,
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
import { RemoveLiquidityTxInput } from '../../lib/utils/types';
import {
    assertRemoveLiquidityProportional,
    assertRemoveLiquiditySingleTokenExactIn,
    assertRemoveLiquiditySingleTokenExactOut,
    assertRemoveLiquidityUnbalanced,
    doRemoveLiquidity,
} from '../../lib/utils/removeLiquidityHelper';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const poolId =
    '0x1a44e35d5451e0b78621a1b3e7a53dfaa306b1d000000000000000000000051b'; // baoETH-ETH StablePool

const wETH = TOKENS[chainId].WETH;

describe('composable stable remove liquidity test', () => {
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
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
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

    describe('remove liquidity unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            const bptIndex = txInput.poolState.tokens.findIndex(
                (t) => t.address === txInput.poolState.address,
            );
            const poolTokensWithoutBpt = txInput.poolState.tokens
                .map((t) => new Token(chainId, t.address, t.decimals))
                .filter((_, index) => index !== bptIndex);

            amountsOut = poolTokensWithoutBpt.map((t) => ({
                rawAmount: parseUnits('20', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Unbalanced,
            };
        });
        test('with wrapped', async () => {
            const removeLiquidityInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
            });
            assertRemoveLiquidityUnbalanced(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const receiveNativeAsset = true;
            const removeLiquidityInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
                receiveNativeAsset,
            });
            assertRemoveLiquidityUnbalanced(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                receiveNativeAsset,
            );
        });
    });

    describe('remove liquidity single token exact out', async () => {
        let input: Omit<RemoveLiquiditySingleTokenExactOutInput, 'amountOut'>;
        let amountOut: InputAmount;
        beforeAll(() => {
            amountOut = {
                rawAmount: parseUnits('20', wETH.decimals),
                decimals: wETH.decimals,
                address: wETH.address,
            };
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.SingleTokenExactOut,
            };
        });
        test('with wrapped', async () => {
            const removeLiquidityInput = {
                ...input,
                amountOut,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
            });
            assertRemoveLiquiditySingleTokenExactOut(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const receiveNativeAsset = true;
            const removeLiquidityInput = {
                ...input,
                amountOut,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
                receiveNativeAsset,
            });
            assertRemoveLiquiditySingleTokenExactOut(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                receiveNativeAsset,
            );
        });
    });

    describe('remove liquidity single token exact in', () => {
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
        test('with wrapped', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquiditySingleTokenExactIn(
                txInput.client.chain?.id as number,
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const receiveNativeAsset = true;
            const removeLiquidityInput = {
                ...input,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
                receiveNativeAsset,
            });

            assertRemoveLiquiditySingleTokenExactIn(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                receiveNativeAsset,
            );
        });
    });

    describe('remove liquidity proportional', () => {
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
        test('with native', async () => {
            const receiveNativeAsset = true;
            const removeLiquidityInput = {
                ...input,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
                receiveNativeAsset,
            });
            assertRemoveLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
                2,
                receiveNativeAsset,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address:
                    '0x1a44e35d5451e0b78621a1b3e7a53dfaa306b1d0' as Address, // B-baoETH-ETH-BPT
                decimals: 18,
                index: 0,
            },
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 1,
            },
            {
                address:
                    '0xf4edfad26ee0d23b69ca93112ecce52704e0006f' as Address, // baoETH
                decimals: 18,
                index: 2,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.ComposableStable,
            tokens,
            vaultVersion: 2,
        };
    }
}

/******************************************************************************/
