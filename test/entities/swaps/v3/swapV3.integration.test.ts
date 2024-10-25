// pnpm test -- swapV3.integration.test.ts
import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    SwapKind,
    Token,
    Swap,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    BALANCER_ROUTER,
    BALANCER_BATCH_ROUTER,
    PERMIT2,
    PublicWalletClient,
} from '@/index';
import { Path } from '@/entities/swap/paths/types';

import {
    approveSpenderOnTokens,
    approveTokens,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo shouldn't change as checks depend on token balances
const blockNo = 6940180n;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;
const boosted_pool = POOLS[chainId].MOCK_BOOSTED_POOL;
const stataUSDC = TOKENS[chainId].stataUSDC;
const stataUSDT = TOKENS[chainId].stataUSDT;

describe('SwapV3', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;
    let pathBalWeth: Path;
    let pathMultiSwap: Path;
    let pathUsdcWethMulti: Path;
    let pathWithExit: Path;
    let pathUsdcWethJoin: Path;
    let tokens: Address[];

    beforeAll(async () => {
        // weth [swap] bal
        pathBalWeth = {
            protocolVersion,
            tokens: [
                {
                    address: BAL.address,
                    decimals: BAL.decimals,
                },
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                },
            ],
            pools: [POOLS[chainId].MOCK_WETH_BAL_POOL.id],
            inputAmountRaw: 100000000000n,
            outputAmountRaw: 100000000000n,
        };

        // weth [swap] bal [swap] dai [swap] usdc
        pathMultiSwap = {
            protocolVersion,
            tokens: [
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                },
                {
                    address: BAL.address,
                    decimals: BAL.decimals,
                },
                {
                    address: DAI.address,
                    decimals: DAI.decimals,
                },
                {
                    address: USDC.address,
                    decimals: USDC.decimals,
                },
            ],
            pools: [
                POOLS[chainId].MOCK_WETH_BAL_POOL.id,
                POOLS[chainId].MOCK_BAL_DAI_POOL.id,
                POOLS[chainId].MOCK_USDC_DAI_POOL.id,
            ],
            inputAmountRaw: 100000000000000n,
            outputAmountRaw: 2000000n,
        };

        // usdc [swap] dai [swap] bal [swap] weth
        pathUsdcWethMulti = {
            ...pathMultiSwap,
            tokens: [...pathMultiSwap.tokens].reverse(),
            pools: [...pathMultiSwap.pools].reverse(),
            inputAmountRaw: 100000n,
            outputAmountRaw: 40000000000000n,
        };

        // weth [swap] bpt [exit] usdc
        pathWithExit = {
            protocolVersion,
            tokens: [
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                },
                {
                    address: USDC_DAI_BPT.address,
                    decimals: USDC_DAI_BPT.decimals,
                },
                {
                    address: USDC.address,
                    decimals: USDC.decimals,
                },
            ],
            pools: [
                POOLS[chainId].MOCK_NESTED_POOL.id,
                POOLS[chainId].MOCK_USDC_DAI_POOL.id,
            ],
            inputAmountRaw: 100000000000000n,
            outputAmountRaw: 6000000n,
        };

        // usdc [join] bpt [swap] weth
        pathUsdcWethJoin = {
            ...pathWithExit,
            tokens: [...pathWithExit.tokens].reverse(),
            pools: [...pathWithExit.pools].reverse(),
            inputAmountRaw: 6000000n,
            outputAmountRaw: 600000000000000n,
        };

        const fork = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            blockNo,
        );
        rpcUrl = fork.rpcUrl;
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        tokens = [WETH.address, BAL.address, USDC.address];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot, USDC.slot] as number[],
            [parseEther('100'), parseEther('100'), 100000000000n],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        // Uses Special RPC methods to revert state back to same snapshot for each test
        // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('query method should return correct updated', () => {
        describe('single swap', () => {
            test('GivenIn', async () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathBalWeth],
                    swapKind: SwapKind.GivenIn,
                });

                const expected = (await swap.query(
                    rpcUrl,
                )) as ExactInQueryOutput;

                const wethToken = new Token(
                    chainId,
                    WETH.address,
                    WETH.decimals,
                );
                expect(expected.expectedAmountOut.token).to.deep.eq(wethToken);
                expect(expected.expectedAmountOut.amount).to.eq(98999999n);
            });
            test('GivenOut', async () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathBalWeth],
                    swapKind: SwapKind.GivenOut,
                });

                const expected = (await swap.query(
                    rpcUrl,
                )) as ExactOutQueryOutput;

                const balToken = new Token(chainId, BAL.address, BAL.decimals);
                expect(expected.expectedAmountIn.token).to.deep.eq(balToken);
                expect(expected.expectedAmountIn.amount).to.eq(
                    101010202020405n,
                );
            });
        });
        describe('multi-hop swap', () => {
            describe('path with swaps only', () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathMultiSwap],
                        swapKind: SwapKind.GivenIn,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactInQueryOutput;

                    const usdcToken = new Token(
                        chainId,
                        USDC.address,
                        USDC.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenIn);
                    expect(expected.pathAmounts).to.deep.eq([193863n]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(193863n);
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathMultiSwap],
                        swapKind: SwapKind.GivenOut,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactOutQueryOutput;

                    const wethToken = new Token(
                        chainId,
                        WETH.address,
                        WETH.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenOut);
                    expect(expected.pathAmounts).to.deep.eq([
                        1041497493625045n,
                    ]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        wethToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(
                        1041497493625045n,
                    );
                });
            });
            describe('path with exit', () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathMultiSwap, pathWithExit],
                        swapKind: SwapKind.GivenIn,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactInQueryOutput;

                    const usdcToken = new Token(
                        chainId,
                        USDC.address,
                        USDC.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenIn);
                    expect(expected.pathAmounts).to.deep.eq([
                        193863n,
                        3901118n,
                    ]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(4094981n);
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathMultiSwap, pathWithExit],
                        swapKind: SwapKind.GivenOut,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactOutQueryOutput;

                    const wethToken = new Token(
                        chainId,
                        WETH.address,
                        WETH.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenOut);
                    expect(expected.pathAmounts).to.deep.eq([
                        1041497493625045n,
                        154666227372924n,
                    ]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        wethToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(
                        1196163720997969n,
                    );
                });
            });
        });
    });

    describe('permit2 direct approval', () => {
        beforeEach(async () => {
            await approveTokens(client, testAddress, tokens, protocolVersion);
        });
        describe('single swap', () => {
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenIn,
                        });
                        await assertSwapExactIn({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: false,
                        });
                    });
                    test('GivenOut', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        });
                        await assertSwapExactOut({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: false,
                        });
                    });
                });
                describe('wethIsEth: true', () => {
                    describe('eth out', async () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathBalWeth],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn({
                                contractToCall: BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                            });
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathBalWeth],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut({
                                contractToCall: BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                            });
                        });
                    });
                    describe('eth in', () => {
                        test('GivenIn', async () => {
                            const pathWethBal = {
                                ...pathBalWeth,
                                tokens: [...pathBalWeth.tokens].reverse(),
                            };
                            const swap = new Swap({
                                chainId,
                                paths: [pathWethBal],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn({
                                contractToCall: BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                            });
                        });
                        test('GivenOut', async () => {
                            const pathWethBal = {
                                ...pathBalWeth,
                                tokens: [...pathBalWeth.tokens].reverse(),
                            };
                            const swap = new Swap({
                                chainId,
                                paths: [pathWethBal],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut({
                                contractToCall: BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                            });
                        });
                    });
                });
            });
        });

        describe('multi-hop swap', () => {
            describe('swap should be executed correctly', () => {
                describe('path with swaps only', () => {
                    describe('wethIsEth: false', () => {
                        const wethIsEth = false;
                        test('GivenIn', async () => {
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenIn,
                                }),
                                wethIsEth,
                            });
                        });
                        test('GivenOut', async () => {
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenOut,
                                }),
                                wethIsEth,
                            });
                        });
                    });
                    describe('wethIsEth: true', () => {
                        const wethIsEth = true;
                        describe('eth in', async () => {
                            test('GivenIn', async () => {
                                await assertSwapExactIn({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap: new Swap({
                                        chainId,
                                        paths: [pathMultiSwap],
                                        swapKind: SwapKind.GivenIn,
                                    }),
                                    wethIsEth,
                                });
                            });
                            test('GivenOut', async () => {
                                await assertSwapExactOut({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap: new Swap({
                                        chainId,
                                        paths: [pathMultiSwap],
                                        swapKind: SwapKind.GivenOut,
                                    }),
                                    wethIsEth,
                                });
                            });
                        });
                        describe('eth out', () => {
                            test('GivenIn', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathUsdcWethMulti],
                                    swapKind: SwapKind.GivenIn,
                                });
                                await assertSwapExactIn({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth,
                                });
                            });
                            test('GivenOut', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathUsdcWethMulti],
                                    swapKind: SwapKind.GivenOut,
                                });
                                await assertSwapExactOut({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth,
                                });
                            });
                        });
                    });
                });
                describe('paths with exit/join', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: false,
                            });
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: false,
                            });
                        });
                    });
                    describe('wethIsEth: true', () => {
                        describe('eth in', async () => {
                            test('GivenIn', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathMultiSwap, pathWithExit],
                                    swapKind: SwapKind.GivenIn,
                                });
                                await assertSwapExactIn({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth: true,
                                });
                            });
                            test('GivenOut', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathMultiSwap, pathWithExit],
                                    swapKind: SwapKind.GivenOut,
                                });
                                await assertSwapExactOut({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth: true,
                                });
                            });
                        });
                        describe('eth out', () => {
                            test('GivenIn', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [
                                        pathUsdcWethMulti,
                                        pathUsdcWethJoin,
                                    ],
                                    swapKind: SwapKind.GivenIn,
                                });
                                await assertSwapExactIn({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth: true,
                                });
                            });
                            test('GivenOut', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [
                                        pathUsdcWethMulti,
                                        pathUsdcWethJoin,
                                    ],
                                    swapKind: SwapKind.GivenOut,
                                });
                                await assertSwapExactOut({
                                    contractToCall:
                                        BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth: true,
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('permit2 signatures', () => {
        const usePermit2Signatures = true;
        describe('single swap', () => {
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenIn,
                        });
                        await assertSwapExactIn({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: false,
                            usePermit2Signatures,
                        });
                    });
                    test('GivenOut', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        });
                        await assertSwapExactOut({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: false,
                            usePermit2Signatures,
                        });
                    });
                });
                describe('wethIsEth: true', () => {
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenIn,
                        });
                        await assertSwapExactIn({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: true,
                            usePermit2Signatures,
                        });
                    });
                    test('GivenOut', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        });
                        await assertSwapExactOut({
                            contractToCall: BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            wethIsEth: true,
                            usePermit2Signatures,
                        });
                    });
                });
            });
        });

        describe('multi-hop swap', () => {
            describe('swap should be executed correctly', () => {
                describe('path with swaps only', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenIn,
                                }),
                                wethIsEth: false,
                                usePermit2Signatures,
                            });
                        });
                        test('GivenOut', async () => {
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenOut,
                                }),
                                wethIsEth: false,
                                usePermit2Signatures,
                            });
                        });
                    });
                    describe('wethIsEth: true', () => {
                        test('GivenIn', async () => {
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenIn,
                                }),
                                wethIsEth: true,
                                usePermit2Signatures,
                            });
                        });
                        test('GivenOut', async () => {
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap: new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenOut,
                                }),
                                wethIsEth: true,
                                usePermit2Signatures,
                            });
                        });
                    });
                });
                describe('paths with exit/join', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: false,
                                usePermit2Signatures,
                            });
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: false,
                                usePermit2Signatures,
                            });
                        });
                    });
                    describe('wethIsEth: true', () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                                usePermit2Signatures,
                            });
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                                usePermit2Signatures,
                            });
                        });
                    });
                });
            });
        });
    });

    describe('boosted', () => {
        describe('multi-hop swap', () => {
            // USDC[wrap]aUSDC[swap]aUSDT[unwrap]USDT
            const pathWithBuffers = {
                protocolVersion: 3,
                tokens: [
                    {
                        address: USDC.address,
                        decimals: USDC.decimals,
                    },
                    {
                        address: stataUSDC.address,
                        decimals: stataUSDC.decimals,
                    },
                    {
                        address: stataUSDT.address,
                        decimals: stataUSDT.decimals,
                    },
                    {
                        address: USDT.address,
                        decimals: USDT.decimals,
                    },
                ],
                pools: [
                    stataUSDC.address,
                    boosted_pool.address,
                    stataUSDT.address,
                ],
                isBuffer: [true, false, true],
            };

            describe('query method should return correct updated', () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 100000000n,
                                outputAmountRaw: 0n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenIn,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactInQueryOutput;

                    const usdtToken = new Token(
                        chainId,
                        USDT.address,
                        USDT.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenIn);
                    expect(expected.pathAmounts).to.deep.eq([99910226n]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        usdtToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(99910226n);
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 0n,
                                outputAmountRaw: 100000000n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenOut,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactOutQueryOutput;

                    const usdcToken = new Token(
                        chainId,
                        USDC.address,
                        USDC.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenOut);
                    expect(expected.pathAmounts).to.deep.eq([100089856n]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(100089856n);
                });
            });
            describe('swap should be executed correctly', () => {
                beforeEach(async () => {
                    await approveTokens(
                        client,
                        testAddress,
                        tokens,
                        protocolVersion,
                    );
                });
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 100000000n,
                                outputAmountRaw: 0n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenIn,
                    });
                    // Buffers can have a small difference due to rates so we don't check for 100% match between result and query
                    await assertSwapExactIn({
                        contractToCall: BALANCER_BATCH_ROUTER[chainId],
                        client,
                        rpcUrl,
                        chainId,
                        swap,
                        wethIsEth: false,
                        outputTest: {
                            testExactOutAmount: false,
                            percentage: 0.001,
                        },
                    });
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 0n,
                                outputAmountRaw: 10000000n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenOut,
                    });
                    await assertSwapExactOut({
                        contractToCall: BALANCER_BATCH_ROUTER[chainId],
                        client,
                        rpcUrl,
                        chainId,
                        swap,
                        wethIsEth: false,
                        inputTest: {
                            testExactInAmount: false,
                            percentage: 0.001,
                        },
                    });
                });
            });
        });
    });
});
