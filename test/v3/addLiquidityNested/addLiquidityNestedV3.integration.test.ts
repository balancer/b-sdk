// pnpm test -- addLiquidityNestedV3.integration.test.ts
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
    zeroAddress,
} from 'viem';
import {
    Address,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    CHAINS,
    ChainId,
    PERMIT2,
    PublicWalletClient,
    Slippage,
    Token,
    TokenAmount,
    AddLiquidityNested,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    AddLiquidityNestedCallInput,
} from '@/index';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    areBigIntsWithinPercent,
    sendTransactionGetBalances,
    setTokenBalances,
} from 'test/lib/utils';
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

describe('V3 add liquidity nested test, with Permit2 direct approval', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;
    const addLiquidityNested = new AddLiquidityNested();

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            mainTokens.map((t) => t.address),
            [WETH.slot, USDT.slot, USDC.slot] as number[],
            mainTokens.map((t) => parseUnits('1000', t.decimals)),
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
        const addLiquidityInput: AddLiquidityNestedInput = {
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('0.001', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: USDC.address,
                    rawAmount: parseUnits('2', USDC.decimals),
                    decimals: USDC.decimals,
                },
            ],
            chainId,
            rpcUrl,
        };
        const queryOutput = await addLiquidityNested.query(
            addLiquidityInput,
            nestedWithBoostedPool,
        );
        const expectedAmountsIn = [
            TokenAmount.fromHumanAmount(wethToken, '0.001'),
            TokenAmount.fromHumanAmount(usdtToken, '0'),
            TokenAmount.fromHumanAmount(usdcToken, '2'),
        ];
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptOut.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptOut.amount > 0n).to.be.true;
        expect(queryOutput.amountsIn).to.deep.eq(expectedAmountsIn);
    });

    describe('add liquidity transaction', async () => {
        test('with tokens', async () => {
            const addLiquidityInput: AddLiquidityNestedInput = {
                amountsIn: [
                    {
                        address: WETH.address,
                        rawAmount: parseUnits('0.001', WETH.decimals),
                        decimals: WETH.decimals,
                    },
                    {
                        address: USDC.address,
                        rawAmount: parseUnits('2', USDC.decimals),
                        decimals: USDC.decimals,
                    },
                ],
                chainId,
                rpcUrl,
            };

            for (const amount of addLiquidityInput.amountsIn) {
                // Approve Permit2 to spend account tokens
                await approveSpenderOnToken(
                    client,
                    testAddress,
                    amount.address,
                    PERMIT2[chainId],
                );
                // Approve Router to spend account tokens using Permit2
                await approveSpenderOnPermit2(
                    client,
                    testAddress,
                    amount.address,
                    BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
                );
            }

            const queryOutput = (await addLiquidityNested.query(
                addLiquidityInput,
                nestedWithBoostedPool,
            )) as AddLiquidityNestedQueryOutputV3;

            const addLiquidityBuildInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%,
            };

            const addLiquidityBuildCallOutput = addLiquidityNested.buildCall(
                addLiquidityBuildInput,
            );
            expect(addLiquidityBuildCallOutput.value === 0n).to.be.true;
            expect(addLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            // send add liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        ...mainTokens.map((t) => t.address),
                        queryOutput.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    addLiquidityBuildCallOutput.to,
                    addLiquidityBuildCallOutput.callData,
                    addLiquidityBuildCallOutput.value,
                );

            expect(transactionReceipt.status).to.eq('success');
            const expectedAmountsIn = [
                TokenAmount.fromHumanAmount(wethToken, '0.001'),
                TokenAmount.fromHumanAmount(usdtToken, '0'),
                TokenAmount.fromHumanAmount(usdcToken, '2'),
            ];

            expect(expectedAmountsIn.map((a) => a.amount)).to.deep.eq(
                balanceDeltas.slice(0, -1),
            );
            // Here we check that output diff is within an acceptable tolerance.
            // !!! This should only be used in the case of buffers as all other cases can be equal
            areBigIntsWithinPercent(
                balanceDeltas[balanceDeltas.length - 1],
                queryOutput.bptOut.amount,
                0.001,
            );
        });

        test('with native', async () => {
            const addLiquidityInput: AddLiquidityNestedInput = {
                amountsIn: [
                    {
                        address: WETH.address,
                        rawAmount: parseUnits('0.001', WETH.decimals),
                        decimals: WETH.decimals,
                    },
                    {
                        address: USDC.address,
                        rawAmount: parseUnits('2', USDC.decimals),
                        decimals: USDC.decimals,
                    },
                ],
                chainId,
                rpcUrl,
            };

            for (const amount of addLiquidityInput.amountsIn) {
                // Approve Permit2 to spend account tokens
                await approveSpenderOnToken(
                    client,
                    testAddress,
                    amount.address,
                    PERMIT2[chainId],
                );
                // Approve Router to spend account tokens using Permit2
                await approveSpenderOnPermit2(
                    client,
                    testAddress,
                    amount.address,
                    BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
                );
            }

            const queryOutput = (await addLiquidityNested.query(
                addLiquidityInput,
                nestedWithBoostedPool,
            )) as AddLiquidityNestedQueryOutputV3;

            const addLiquidityBuildInput: AddLiquidityNestedCallInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%,
                wethIsEth: true,
            };

            const addLiquidityBuildCallOutput = addLiquidityNested.buildCall(
                addLiquidityBuildInput,
            );
            expect(
                addLiquidityBuildCallOutput.value ===
                    addLiquidityInput.amountsIn[0].rawAmount,
            ).to.be.true;
            expect(addLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            // send add liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        zeroAddress,
                        ...mainTokens.map((t) => t.address),
                        queryOutput.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    addLiquidityBuildCallOutput.to,
                    addLiquidityBuildCallOutput.callData,
                    addLiquidityBuildCallOutput.value,
                );

            expect(transactionReceipt.status).to.eq('success');
            const expectedAmountsIn = [
                TokenAmount.fromHumanAmount(wethToken, '0.001'), // checking against ETH
                TokenAmount.fromHumanAmount(wethToken, '0'), // checking against WETH
                TokenAmount.fromHumanAmount(usdtToken, '0'),
                TokenAmount.fromHumanAmount(usdcToken, '2'),
            ];

            expect(expectedAmountsIn.map((a) => a.amount)).to.deep.eq(
                balanceDeltas.slice(0, -1),
            );
            // Here we check that output diff is within an acceptable tolerance.
            // !!! This should only be used in the case of buffers as all other cases can be equal
            areBigIntsWithinPercent(
                balanceDeltas[balanceDeltas.length - 1],
                queryOutput.bptOut.amount,
                0.001,
            );
        });
    });
});
