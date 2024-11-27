// pnpm test -- removeLiquidityPartialBoosted.integration.test.ts
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
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    Slippage,
    RemoveLiquidityBoostedV3,
    RemoveLiquidityBoostedProportionalInput,
    RemoveLiquidityKind,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    areBigIntsWithinPercent,
    GetBoostedBpt,
    sendTransactionGetBalances,
    TOKENS,
} from 'test/lib/utils';
import { validateTokenAmounts } from 'test/lib/utils/removeNestedHelpers';
import { partialBoostedPool_USDT_stataDAI } from 'test/mockData/partialBoostedPool';

const chainId = ChainId.SEPOLIA;
const USDT = TOKENS[chainId].USDT_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;

const parentBptToken = new Token(
    chainId,
    partialBoostedPool_USDT_stataDAI.address,
    18,
);
// These are the underlying tokens
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const daiToken = new Token(chainId, DAI.address, DAI.decimals);

// TODO: pending test pool to be created/initialized
describe.skip('V3 remove liquidity partial boosted', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityBoosted = new RemoveLiquidityBoostedV3();
    let bptAmount: bigint;

    let removeLiquidityInput: RemoveLiquidityBoostedProportionalInput;

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
        bptAmount = await GetBoostedBpt(
            chainId,
            rpcUrl,
            testAddress,
            client,
            partialBoostedPool_USDT_stataDAI,
            [
                {
                    address: USDT.address,
                    rawAmount: parseUnits('10', USDT.decimals),
                    decimals: USDT.decimals,
                    slot: USDT.slot as number,
                },
                {
                    address: DAI.address,
                    rawAmount: parseUnits('2', DAI.decimals),
                    decimals: DAI.decimals,
                    slot: DAI.slot as number,
                },
            ],
        );

        removeLiquidityInput = {
            chainId,
            rpcUrl,
            bptIn: {
                address: partialBoostedPool_USDT_stataDAI.address,
                decimals: 18,
                rawAmount: bptAmount,
            },
            kind: RemoveLiquidityKind.Proportional,
        };
    });

    test('query with underlying', async () => {
        const queryOutput = await removeLiquidityBoosted.query(
            removeLiquidityInput,
            partialBoostedPool_USDT_stataDAI,
        );
        expect(queryOutput.poolType).to.eq(
            partialBoostedPool_USDT_stataDAI.type,
        );
        expect(queryOutput.poolId).to.eq(
            partialBoostedPool_USDT_stataDAI.address,
        );
        expect(queryOutput.chainId).to.eq(chainId);
        expect(queryOutput.userData).to.eq('0x');
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptIn.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptIn.amount).to.eq(
            removeLiquidityInput.bptIn.rawAmount,
        );
        expect(queryOutput.amountsOut.length).to.eq(
            partialBoostedPool_USDT_stataDAI.tokens.length,
        );
        validateTokenAmounts(queryOutput.amountsOut, [usdtToken, daiToken]);
    });

    test('remove liquidity transaction, direct approval on router', async () => {
        // Removals do NOT use Permit2. Here we directly approave the Router to spend the users BPT using ERC20 approval
        await approveSpenderOnToken(
            client,
            testAddress,
            parentBptToken.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );

        const queryOutput = await removeLiquidityBoosted.query(
            removeLiquidityInput,
            partialBoostedPool_USDT_stataDAI,
        );

        const removeLiquidityBuildInput = {
            ...queryOutput,
            slippage: Slippage.fromPercentage('1'), // 1%,
        };

        const addLiquidityBuildCallOutput = removeLiquidityBoosted.buildCall(
            removeLiquidityBuildInput,
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
                    removeLiquidityInput.bptIn.address,
                    ...queryOutput.amountsOut.map((a) => a.token.address),
                ],
                client,
                testAddress,
                addLiquidityBuildCallOutput.to,
                addLiquidityBuildCallOutput.callData,
            );
        expect(transactionReceipt.status).to.eq('success');
        // Should match user bpt amount in and query result for amounts out
        const expectedDeltas = [
            removeLiquidityInput.bptIn.rawAmount,
            ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
        ];
        // Here we check that output diff is within an acceptable tolerance as buffers can have difference in queries/result
        expectedDeltas.forEach((delta, i) => {
            areBigIntsWithinPercent(delta, balanceDeltas[i], 0.001);
        });
    });
});
