// pnpm test -- removeLiquidityNestedV3Signature.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
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
    RemoveLiquidityNested,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    Slippage,
    PermitHelper,
    RemoveLiquidityNestedCallInputV3,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    areBigIntsWithinPercent,
    sendTransactionGetBalances,
} from 'test/lib/utils';
import { GetNestedBpt } from 'test/lib/utils/removeNestedHelpers';
import {
    nestedWithBoostedPool,
    USDC,
    USDT,
    WETH,
} from 'test/mockData/nestedPool';

const chainId = ChainId.SEPOLIA;

// These are the underlying tokens
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const mainTokens = [wethToken, usdtToken, usdcToken];

describe('V3 remove liquidity nested test, with Permit signature', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityNested = new RemoveLiquidityNested();
    let bptAmount: bigint;

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
    });

    test('remove liquidity transaction', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: bptAmount,
            chainId,
            rpcUrl,
        };

        const queryOutput = await removeLiquidityNested.query(
            removeLiquidityInput,
            nestedWithBoostedPool,
        );

        const removeLiquidityBuildInput = {
            ...queryOutput,
            slippage: Slippage.fromPercentage('1'), // 1%,
        } as RemoveLiquidityNestedCallInputV3;

        // Removals do NOT use Permit2. Here we sign a Permit approval for the CompositeRouter to spend the users BPT using ERC20 approval
        const permit = await PermitHelper.signRemoveLiquidityNestedApproval({
            ...removeLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        const addLiquidityBuildCallOutput =
            removeLiquidityNested.buildCallWithPermit(
                removeLiquidityBuildInput,
                permit,
            );

        // Build call minAmountsOut should be query result with slippage applied
        const expectedMinAmountsOut = queryOutput.amountsOut.map((amountOut) =>
            removeLiquidityBuildInput.slippage.applyTo(amountOut.amount, -1),
        );
        expect(expectedMinAmountsOut).to.deep.eq(
            addLiquidityBuildCallOutput.minAmountsOut.map((a) => a.amount),
        );
        expect(addLiquidityBuildCallOutput.to).to.eq(
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );

        // send remove liquidity transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [
                    queryOutput.bptAmountIn.token.address,
                    ...mainTokens.map((t) => t.address),
                ],
                client,
                testAddress,
                addLiquidityBuildCallOutput.to,
                addLiquidityBuildCallOutput.callData,
            );
        expect(transactionReceipt.status).to.eq('success');
        // Should match user bpt amount in and query result for amounts out
        const expectedDeltas = [
            removeLiquidityInput.bptAmountIn,
            ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
        ];
        queryOutput.amountsOut.map(
            (amountOut) => expect(amountOut.amount > 0n).to.be.true,
        );
        // expect(expectedDeltas).to.deep.eq(balanceDeltas);
        expectedDeltas.forEach((delta, i) => {
            areBigIntsWithinPercent(delta, balanceDeltas[i], 0.001);
        });
    });
});
