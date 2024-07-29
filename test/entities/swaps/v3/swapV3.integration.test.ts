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
    Client,
    PublicActions,
    TestActions,
    WalletActions,
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
    buildCallWithPermit2ETHError,
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
const blockNo = 6288761n;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
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
            [parseEther('100'), parseEther('100'), 100000000n],
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
                expect(expected.expectedAmountOut.amount).to.eq(22499954n);
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
                    440022000880061n,
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
                    expect(expected.pathAmounts).to.deep.eq([1196920n]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(1196920n);
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
                    expect(expected.pathAmounts).to.deep.eq([170018381187389n]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        wethToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(
                        170018381187389n,
                    );
                });
            });
            describe.skip('path with exit', () => {
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
                    expect(expected.pathAmounts).to.deep.eq([151734n, 779073n]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(930807n);
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
                        1827358022063780n,
                        841746490376824n,
                    ]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        wethToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(
                        2669104512440604n,
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
                        await assertSwapExactIn(
                            BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            false,
                        );
                    });
                    test('GivenOut', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        });
                        await assertSwapExactOut(
                            BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            false,
                        );
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
                            await assertSwapExactIn(
                                BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                true,
                            );
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathBalWeth],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut(
                                BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                true,
                            );
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
                            await assertSwapExactIn(
                                BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                true,
                            );
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
                            await assertSwapExactOut(
                                BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                true,
                            );
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
                            await assertSwapExactIn(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenIn,
                                }),
                                wethIsEth,
                            );
                        });
                        test('GivenOut', async () => {
                            await assertSwapExactOut(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenOut,
                                }),
                                wethIsEth,
                            );
                        });
                    });
                    describe('wethIsEth: true', () => {
                        const wethIsEth = true;
                        describe('eth in', async () => {
                            test('GivenIn', async () => {
                                await assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    new Swap({
                                        chainId,
                                        paths: [pathMultiSwap],
                                        swapKind: SwapKind.GivenIn,
                                    }),
                                    wethIsEth,
                                );
                            });
                            test('GivenOut', async () => {
                                await assertSwapExactOut(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    new Swap({
                                        chainId,
                                        paths: [pathMultiSwap],
                                        swapKind: SwapKind.GivenOut,
                                    }),
                                    wethIsEth,
                                );
                            });
                        });
                        describe('eth out', () => {
                            test('GivenIn', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathUsdcWethMulti],
                                    swapKind: SwapKind.GivenIn,
                                });
                                await assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth,
                                );
                            });
                            test('GivenOut', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathUsdcWethMulti],
                                    swapKind: SwapKind.GivenOut,
                                });
                                await assertSwapExactOut(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    wethIsEth,
                                );
                            });
                        });
                    });
                });
                describe.skip('paths with exit/join', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                false,
                            );
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                false,
                            );
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
                                await assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    true,
                                );
                            });
                            test('GivenOut', async () => {
                                const swap = new Swap({
                                    chainId,
                                    paths: [pathMultiSwap, pathWithExit],
                                    swapKind: SwapKind.GivenOut,
                                });
                                await assertSwapExactOut(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    true,
                                );
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
                                await assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    true,
                                );
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
                                await assertSwapExactOut(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    true,
                                );
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
                        await assertSwapExactIn(
                            BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            false,
                            usePermit2Signatures,
                        );
                    });
                    test('GivenOut', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        });
                        await assertSwapExactOut(
                            BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            false,
                            usePermit2Signatures,
                        );
                    });
                });
                describe('wethIsEth: true', () => {
                    test('should throw', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenIn,
                        });
                        await expect(() =>
                            assertSwapExactIn(
                                BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                true,
                                usePermit2Signatures,
                            ),
                        ).rejects.toThrowError(buildCallWithPermit2ETHError);
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
                            await assertSwapExactIn(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenIn,
                                }),
                                wethIsEth,
                                usePermit2Signatures,
                            );
                        });
                        test('GivenOut', async () => {
                            await assertSwapExactOut(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                new Swap({
                                    chainId,
                                    paths: [pathMultiSwap],
                                    swapKind: SwapKind.GivenOut,
                                }),
                                wethIsEth,
                                usePermit2Signatures,
                            );
                        });
                    });
                    describe('wethIsEth: true', () => {
                        const wethIsEth = true;
                        test('should throw', async () => {
                            await expect(() =>
                                assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    new Swap({
                                        chainId,
                                        paths: [pathMultiSwap],
                                        swapKind: SwapKind.GivenIn,
                                    }),
                                    wethIsEth,
                                    usePermit2Signatures,
                                ),
                            ).rejects.toThrowError(
                                buildCallWithPermit2ETHError,
                            );
                        });
                    });
                });
                describe.skip('paths with exit/join', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await assertSwapExactIn(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                false,
                                usePermit2Signatures,
                            );
                        });
                        test('GivenOut', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenOut,
                            });
                            await assertSwapExactOut(
                                BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                false,
                                usePermit2Signatures,
                            );
                        });
                    });
                    describe('wethIsEth: true', () => {
                        test('should throw', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathMultiSwap, pathWithExit],
                                swapKind: SwapKind.GivenIn,
                            });
                            await expect(() =>
                                assertSwapExactIn(
                                    BALANCER_BATCH_ROUTER[chainId],
                                    client,
                                    rpcUrl,
                                    chainId,
                                    swap,
                                    true,
                                    usePermit2Signatures,
                                ),
                            ).rejects.toThrowError(
                                buildCallWithPermit2ETHError,
                            );
                        });
                    });
                });
            });
        });
    });
});
