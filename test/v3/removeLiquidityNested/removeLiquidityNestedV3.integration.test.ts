// pnpm test -- removeLiquidityNestedV3.integration.test.ts
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
    NestedPoolState,
    PublicWalletClient,
    Token,
    RemoveLiquidityNestedInput,
    RemoveLiquidityNested,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    Slippage,
    RemoveLiquidityNestedCallInputV3,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    POOLS,
    sendTransactionGetBalances,
    TOKENS,
} from 'test/lib/utils';
import {
    GetNestedBpt,
    validateTokenAmounts,
} from 'test/lib/utils/removeNestedHelpers';

const chainId = ChainId.SEPOLIA;
const NESTED_WITH_BOOSTED_POOL = POOLS[chainId].NESTED_WITH_BOOSTED_POOL;
const BOOSTED_POOL = POOLS[chainId].MOCK_BOOSTED_POOL;
const USDT = TOKENS[chainId].USDT_AAVE;
const USDC = TOKENS[chainId].USDC_AAVE;
const WETH = TOKENS[chainId].WETH;

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
            nestedPoolState,
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

    test('query with underlying', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: bptAmount,
            chainId,
            rpcUrl,
        };
        const queryOutput = await removeLiquidityNested.query(
            removeLiquidityInput,
            nestedPoolState,
        );
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptAmountIn.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptAmountIn.amount).to.eq(
            removeLiquidityInput.bptAmountIn,
        );
        expect(queryOutput.amountsOut.length).to.eq(
            nestedPoolState.mainTokens.length,
        );
        validateTokenAmounts(queryOutput.amountsOut, mainTokens);
    });

    test('remove liquidity transaction, direct approval on router', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: bptAmount,
            chainId,
            rpcUrl,
        };

        // Removals do NOT use Permit2. Here we directly approave the Router to spend the users BPT using ERC20 approval
        await approveSpenderOnToken(
            client,
            testAddress,
            parentBptToken.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );

        const queryOutput = await removeLiquidityNested.query(
            removeLiquidityInput,
            nestedPoolState,
        );

        const removeLiquidityBuildInput = {
            ...queryOutput,
            slippage: Slippage.fromPercentage('1'), // 1%,
        } as RemoveLiquidityNestedCallInputV3;

        const addLiquidityBuildCallOutput = removeLiquidityNested.buildCall(
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
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
    });
});

const nestedPoolState: NestedPoolState = {
    protocolVersion: 3,
    pools: [
        {
            id: NESTED_WITH_BOOSTED_POOL.id,
            address: NESTED_WITH_BOOSTED_POOL.address,
            type: NESTED_WITH_BOOSTED_POOL.type,
            level: 1,
            tokens: [
                {
                    address: BOOSTED_POOL.address,
                    decimals: BOOSTED_POOL.decimals,
                    index: 0,
                },
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                    index: 1,
                },
            ],
        },
        {
            id: BOOSTED_POOL.id,
            address: BOOSTED_POOL.address,
            type: BOOSTED_POOL.type,
            level: 0,
            tokens: [
                {
                    address: USDC.address,
                    decimals: USDC.decimals,
                    index: 0,
                },
                {
                    address: USDT.address,
                    decimals: USDT.decimals,
                    index: 1,
                },
            ],
        },
    ],
    mainTokens: [
        {
            address: WETH.address,
            decimals: WETH.decimals,
        },
        {
            address: USDT.address,
            decimals: USDT.decimals,
        },
        {
            address: USDC.address,
            decimals: USDC.decimals,
        },
    ],
};
