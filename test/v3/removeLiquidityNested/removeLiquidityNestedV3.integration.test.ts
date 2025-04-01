// pnpm test -- removeLiquidityNestedV3.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    Hex,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    Address,
    ChainId,
    CHAINS,
    PublicWalletClient,
    Token,
    RemoveLiquidityNestedInput,
    RemoveLiquidityNestedCallInput,
    RemoveLiquidityNested,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED,
    Slippage,
    SDKError,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { approveSpenderOnToken } from 'test/lib/utils';
import {
    assertRemoveLiquidityNested,
    doRemoveLiquidityNested,
    GetNestedBpt,
    RemoveLiquidityNestedTxInput,
    validateTokenAmounts,
} from 'test/lib/utils/removeLiquidityNestedHelper';
import {
    nestedWithBoostedPool,
    NESTED_WITH_BOOSTED_POOL,
    USDC,
    USDT,
    WETH,
} from 'test/mockData/nestedPool';

const chainId = ChainId.SEPOLIA;

const parentBptToken = new Token(
    chainId,
    NESTED_WITH_BOOSTED_POOL.address,
    NESTED_WITH_BOOSTED_POOL.decimals,
);
// These are the underlying tokens
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const mainTokens = [wethToken, usdtToken, usdcToken];

describe('V3 remove liquidity nested test, with Permit direct approval', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityNested = new RemoveLiquidityNested();
    let bptAmount: bigint;
    let snapshot: Hex;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        /*
        We can't use the slot method to set test address BPT balance so we add liquidity instead to get the BPT.
        */
        bptAmount = await GetNestedBpt(
            chainId,
            rpcUrl,
            testAddress,
            client,
            nestedWithBoostedPool,
            [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('0.001', WETH.decimals),
                    decimals: WETH.decimals,
                    slot: WETH.slot as number,
                },
                {
                    address: USDC.address,
                    rawAmount: parseUnits('2', USDC.decimals),
                    decimals: USDC.decimals,
                    slot: USDC.slot as number,
                },
            ],
        );

        // Removals do NOT use Permit2. Here we directly approave the Router to spend the users BPT using ERC20 approval
        await approveSpenderOnToken(
            client,
            testAddress,
            parentBptToken.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId],
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    test('query with underlying', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: bptAmount,
            chainId,
            rpcUrl,
        };
        const queryOutput = await removeLiquidityNested.query(
            removeLiquidityInput,
            nestedWithBoostedPool,
        );
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptAmountIn.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptAmountIn.amount).to.eq(
            removeLiquidityInput.bptAmountIn,
        );
        expect(queryOutput.amountsOut.length).to.eq(
            nestedWithBoostedPool.mainTokens.length,
        );
        validateTokenAmounts(queryOutput.amountsOut, mainTokens);
    });

    test('nested operations not supported on avalanche', async () => {
        const addLiquidityInput = {} as RemoveLiquidityNestedInput;
        const avaxAddLiquidityInput = {
            ...addLiquidityInput,
            protocolVersion: 3,
            chainId: ChainId.AVALANCHE,
        };
        await expect(
            removeLiquidityNested.query(
                avaxAddLiquidityInput,
                nestedWithBoostedPool,
            ),
        ).rejects.toThrow(
            new SDKError(
                'Input Validation',
                'Add Liquidity Nested',
                'Balancer V3 does not support this operation on Avalanche',
            ),
        );

        const removeLiquidityNestedBuildCallInput = {
            protocolVersion: 3 as const,
            chainId: ChainId.AVALANCHE,
        } as RemoveLiquidityNestedCallInput;

        expect(() => {
            removeLiquidityNested.buildCall(
                removeLiquidityNestedBuildCallInput,
            );
        }).toThrow(
            new SDKError(
                'Input Validation',
                'Add Liquidity Nested',
                'Balancer V3 does not support this operation on Avalanche',
            ),
        );
    });

    describe('remove liquidity transaction, direct approval on router', async () => {
        test('with tokens', async () => {
            const removeLiquidityNestedInput: RemoveLiquidityNestedInput = {
                bptAmountIn: bptAmount,
                chainId,
                rpcUrl,
            };

            const txInput: RemoveLiquidityNestedTxInput = {
                client,
                removeLiquidityNested,
                removeLiquidityNestedInput,
                testAddress,
                nestedPoolState: nestedWithBoostedPool,
                slippage: Slippage.fromPercentage('1'), // 1%
            };

            const output = await doRemoveLiquidityNested(txInput);

            assertRemoveLiquidityNested(output, txInput.slippage);
        });

        test('with native', async () => {
            const wethIsEth = true;

            const removeLiquidityNestedInput: RemoveLiquidityNestedInput = {
                bptAmountIn: bptAmount,
                chainId,
                rpcUrl,
            };

            const txInput: RemoveLiquidityNestedTxInput = {
                client,
                removeLiquidityNested,
                removeLiquidityNestedInput,
                testAddress,
                nestedPoolState: nestedWithBoostedPool,
                slippage: Slippage.fromPercentage('1'), // 1%
                wethIsEth,
            };

            const output = await doRemoveLiquidityNested(txInput);

            assertRemoveLiquidityNested(output, txInput.slippage, wethIsEth);
        });
    });
});
