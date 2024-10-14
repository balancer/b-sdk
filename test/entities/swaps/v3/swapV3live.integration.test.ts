// pnpm test -- swapV3live.integration.test.ts
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
    BalancerApi,
    TEST_API_ENDPOINT,
    TokenAmount,
    SwapKind,
    Token,
    Swap,
    BALANCER_ROUTER,
    BALANCER_BATCH_ROUTER,
    PERMIT2,
    PublicWalletClient,
} from '@/index';

import {
    approveSpenderOnTokens,
    approveTokens,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
    assertPathsAreVersionTagged,
    assertPathHasMultiHop,
    assertPathHasEitherExitOrJoin,
} from 'test/lib/utils/swapHelpers';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo shouldn't change as checks depend on token balances
const blockNo = 6831205n;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = {
    address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
    decimals: 6,
    slot: 0,
};
// deploy 8
const WETH_USD_BPT = {
    address: '0xcdcada7a6472ab90b6ea4494d966b00b9933f079',
    decimals: 18,
    slot: 0,
};

describe('SwapV3', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;
    let tokens: Address[];
    let api: BalancerApi;

    beforeAll(async () => {
        api = new BalancerApi(TEST_API_ENDPOINT, chainId);

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

    describe('permit2 direct approval', () => {
        beforeEach(async () => {
            await approveTokens(client, testAddress, tokens, protocolVersion);
        });
        describe('single swap', () => {
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    test('GivenIn', async () => {
                        const swapKind = SwapKind.GivenIn;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    BAL as Token,
                                    '1',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }
                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);

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
                        const swapKind = SwapKind.GivenOut;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    WETH as Token,
                                    '0.001',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }
                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: BAL.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        BAL as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: BAL.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);
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
                        test.skip('GivenIn', async () => {
                            // TODO: With current balances, the path won't be a single swap
                            // waiting for stable pool liquidity to be merged v3
                            // and then swap with weth / wsteth
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: BAL.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, false);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);
                            await assertSwapExactIn({
                                contractToCall: BALANCER_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth: true,
                            });
                        });
                        test.skip('GivenOut', async () => {
                            // TODO: With current balances, the path won't be a single swap
                            // waiting for stable pool liquidity to be merged v3
                            // and then swap with weth / wsteth
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: BAL.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        BAL as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, false);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

                            await assertSwapExactIn({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth,
                            });
                        });
                        test('GivenOut', async () => {
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

                            await assertSwapExactOut({
                                contractToCall: BALANCER_BATCH_ROUTER[chainId],
                                client,
                                rpcUrl,
                                chainId,
                                swap,
                                wethIsEth,
                            });
                        });
                    });
                    describe('wethIsEth: true', () => {
                        const wethIsEth = true;
                        describe('eth in', async () => {
                            test('GivenIn', async () => {
                                const swapKind = SwapKind.GivenIn;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: WETH.address,
                                        tokenOut: USDC.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            WETH as Token,
                                            '0.001',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                                const swapKind = SwapKind.GivenOut;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: WETH.address,
                                        tokenOut: USDC.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            USDC as Token,
                                            '10',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                        describe('eth out', () => {
                            test('GivenIn', async () => {
                                const swapKind = SwapKind.GivenIn;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: USDC.address,
                                        tokenOut: WETH.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            USDC as Token,
                                            '10',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                                const swapKind = SwapKind.GivenOut;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: USDC.address,
                                        tokenOut: WETH.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            USDC as Token,
                                            '0.001',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);
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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH_USD_BPT.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasEitherExitOrJoin(sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            // creating the same sor swap request as the v3.integration.test.ts
                            // WEHT [swap] BPT [exit] USDC
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '10',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, true);
                            assertPathHasEitherExitOrJoin(sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                                const swapKind = SwapKind.GivenIn;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: WETH.address,
                                        tokenOut: USDC.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            WETH as Token,
                                            '0.001',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);
                                assertPathHasEitherExitOrJoin(sorPaths);
                                assertPathHasMultiHop(sorPaths, true);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);
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
                                const swapKind = SwapKind.GivenOut;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: WETH.address,
                                        tokenOut: USDC.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            USDC as Token,
                                            '10',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);
                                assertPathHasEitherExitOrJoin(sorPaths);
                                assertPathHasMultiHop(sorPaths, true);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                                const swapKind = SwapKind.GivenIn;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: USDC.address,
                                        tokenOut: WETH.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            USDC as Token,
                                            '10',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);
                                assertPathHasEitherExitOrJoin(sorPaths);
                                assertPathHasMultiHop(sorPaths, true);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                                const swapKind = SwapKind.GivenOut;

                                const sorPaths =
                                    await api.sorSwapPaths.fetchSorSwapPaths({
                                        chainId,
                                        tokenIn: USDC.address,
                                        tokenOut: WETH.address,
                                        swapKind,
                                        swapAmount: TokenAmount.fromHumanAmount(
                                            WETH as Token,
                                            '0.002',
                                        ),
                                        useProtocolVersion: protocolVersion,
                                    });

                                // ISSUE: The api returns protocolVersion == 2 but it should be 3
                                for (const path of sorPaths) {
                                    path.protocolVersion = 3;
                                }

                                assertPathsAreVersionTagged(3, sorPaths);
                                assertPathHasEitherExitOrJoin(sorPaths);
                                assertPathHasMultiHop(sorPaths, true);

                                const swapInput = {
                                    chainId,
                                    paths: sorPaths,
                                    swapKind,
                                };

                                const swap = new Swap(swapInput);

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
                        const swapKind = SwapKind.GivenIn;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    BAL as Token,
                                    '1',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }
                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);
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
                        const swapKind = SwapKind.GivenOut;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    WETH as Token,
                                    '0.001',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }
                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);
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
                        const swapKind = SwapKind.GivenIn;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    BAL as Token,
                                    '1',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }

                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);

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
                        const swapKind = SwapKind.GivenOut;

                        const sorPaths =
                            await api.sorSwapPaths.fetchSorSwapPaths({
                                chainId,
                                tokenIn: BAL.address,
                                tokenOut: WETH.address,
                                swapKind,
                                swapAmount: TokenAmount.fromHumanAmount(
                                    WETH as Token,
                                    '0.001',
                                ),
                                useProtocolVersion: protocolVersion,
                            });

                        // ISSUE: The api returns protocolVersion == 2 but it should be 3
                        for (const path of sorPaths) {
                            path.protocolVersion = 3;
                        }

                        assertPathsAreVersionTagged(3, sorPaths);

                        const swapInput = {
                            chainId,
                            paths: sorPaths,
                            swapKind,
                        };

                        const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '10',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                describe('paths with exit/join', () => {
                    describe('wethIsEth: false', () => {
                        test('GivenIn', async () => {
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: USDC.address,
                                    tokenOut: WETH_USD_BPT.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '1',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasEitherExitOrJoin(sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            // creating the same sor swap request as the v3.integration.test.ts
                            // WEHT [swap] BPT [exit] USDC
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '10',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasMultiHop(sorPaths, true);
                            assertPathHasEitherExitOrJoin(sorPaths);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenIn;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        WETH as Token,
                                        '0.001',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasEitherExitOrJoin(sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);

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
                            const swapKind = SwapKind.GivenOut;

                            const sorPaths =
                                await api.sorSwapPaths.fetchSorSwapPaths({
                                    chainId,
                                    tokenIn: WETH.address,
                                    tokenOut: USDC.address,
                                    swapKind,
                                    swapAmount: TokenAmount.fromHumanAmount(
                                        USDC as Token,
                                        '10',
                                    ),
                                    useProtocolVersion: protocolVersion,
                                });

                            // ISSUE: The api returns protocolVersion == 2 but it should be 3
                            for (const path of sorPaths) {
                                path.protocolVersion = 3;
                            }

                            assertPathsAreVersionTagged(3, sorPaths);
                            assertPathHasEitherExitOrJoin(sorPaths);
                            assertPathHasMultiHop(sorPaths, true);

                            const swapInput = {
                                chainId,
                                paths: sorPaths,
                                swapKind,
                            };

                            const swap = new Swap(swapInput);
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
});
