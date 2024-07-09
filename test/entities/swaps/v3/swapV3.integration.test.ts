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
} from '@/index';
import { Path } from '@/entities/swap/paths/types';

import { forkSetup } from 'test/lib/utils/helper';
import {
    ANVIL_NETWORKS,
    startFork,
    stopAnvilFork,
} from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo shouldn't change as checks depend on token balances
const blockNo = 6238034n;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const DAI = TOKENS[chainId].DAI;
const aaveUSDC = TOKENS[chainId].aaveUSDC;
const aaveDAI = TOKENS[chainId].aaveDAI;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;
const stataUSDC = TOKENS[chainId].stataUSDC;
const stataDAI = TOKENS[chainId].stataDAI;

type Override = { Parameters: Hex[]; ReturnType: Hex };

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;

    beforeAll(async () => {
        // resetting the fork between each test avoids changing block state
        await stopAnvilFork(ANVIL_NETWORKS.SEPOLIA, undefined, blockNo);
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
        await forkSetup(
            client,
            testAddress,
            [WETH.address, BAL.address, USDC.address, aaveUSDC.address],
            [
                WETH.slot as number,
                BAL.slot as number,
                USDC.slot as number,
                aaveUSDC.slot as number,
            ],
            [parseEther('100'), parseEther('100'), 100000000n, 100000000n],
            undefined,
            protocolVersion,
        );

        // Uses Special RPC methods to revert state back to same snapshot for each test
        // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
        snapshot = await client.request<Override>({
            method: 'evm_snapshot',
            params: [],
        });
    });

    beforeEach(async () => {
        await client.request<Override>({
            method: 'evm_revert',
            params: [snapshot],
        });
        snapshot = await client.request<Override>({
            method: 'evm_snapshot',
            params: [],
        });
    });

    describe('non-boosted', () => {
        describe('single swap', () => {
            const pathBalWeth: Path = {
                protocolVersion: 3,
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
            describe('query method should return correct updated', () => {
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
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        wethToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(123749996n);
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

                    const balToken = new Token(
                        chainId,
                        BAL.address,
                        BAL.decimals,
                    );
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        balToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(
                        80801616032325n,
                    );
                });
            });
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    const swapParams = {
                        chainId,
                        paths: [pathBalWeth],
                        wethIsEth: false,
                    };
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            ...swapParams,
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
                            ...swapParams,
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
            // weth > bal > dai > usdc
            const pathMultiSwap: Path = {
                protocolVersion: 3,
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
            // weth > bpt > usdc
            const pathWithExit: Path = {
                protocolVersion: 3,
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

            describe('query method should return correct updated', () => {
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
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    const swapParams = {
                        chainId,
                        paths: [pathMultiSwap, pathWithExit],
                        wethIsEth: false,
                    };
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            ...swapParams,
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
                            ...swapParams,
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
                        // usdc > dai > bal > weth
                        const pathUsdcWethMulti = {
                            ...pathMultiSwap,
                            tokens: [...pathMultiSwap.tokens].reverse(),
                            pools: [...pathMultiSwap.pools].reverse(),
                            inputAmountRaw: 100000n,
                            outputAmountRaw: 40000000000000n,
                        };
                        // usdc > bpt > weth
                        const pathUsdcWethJoin = {
                            ...pathWithExit,
                            tokens: [...pathWithExit.tokens].reverse(),
                            pools: [...pathWithExit.pools].reverse(),
                            inputAmountRaw: 6000000n,
                            outputAmountRaw: 600000000000000n,
                        };
                        test('GivenIn', async () => {
                            const swap = new Swap({
                                chainId,
                                paths: [pathUsdcWethMulti, pathUsdcWethJoin],
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
                                paths: [pathUsdcWethMulti, pathUsdcWethJoin],
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
    describe('boosted', () => {
        describe('multi-hop swap', () => {
            // USDC[wrap]aUSDC[swap]aDAI[unwrap]DAI
            const pathWithBuffers = {
                protocolVersion: 3,
                tokens: [
                    {
                        address: aaveUSDC.address,
                        decimals: aaveUSDC.decimals,
                    },
                    {
                        address: stataUSDC.address,
                        decimals: stataUSDC.decimals,
                    },
                    {
                        address: stataDAI.address,
                        decimals: stataDAI.decimals,
                    },
                    {
                        address: aaveDAI.address,
                        decimals: aaveDAI.decimals,
                    },
                ],
                pools: [
                    stataUSDC.address,
                    POOLS[chainId].MOCK_BOOSTED_POOL.id,
                    stataDAI.address,
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
                                inputAmountRaw: 1000000n,
                                outputAmountRaw: 0n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenIn,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactInQueryOutput;

                    const daiToken = new Token(
                        chainId,
                        aaveDAI.address,
                        aaveDAI.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenIn);
                    expect(expected.pathAmounts).to.deep.eq([
                        858147188476657666n,
                    ]);
                    expect(expected.expectedAmountOut.token).to.deep.eq(
                        daiToken,
                    );
                    expect(expected.expectedAmountOut.amount).to.eq(
                        858147188476657666n,
                    );
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 0n,
                                outputAmountRaw: 1000000000000000000n,
                            } as Path,
                        ],
                        swapKind: SwapKind.GivenOut,
                    });

                    const expected = (await swap.query(
                        rpcUrl,
                    )) as ExactOutQueryOutput;

                    const usdcToken = new Token(
                        chainId,
                        aaveUSDC.address,
                        aaveUSDC.decimals,
                    );
                    expect(expected.swapKind).to.eq(SwapKind.GivenOut);
                    expect(expected.pathAmounts).to.deep.eq([1165185n]);
                    expect(expected.expectedAmountIn.token).to.deep.eq(
                        usdcToken,
                    );
                    expect(expected.expectedAmountIn.amount).to.eq(1165185n);
                });
            });
            describe('swap should be executed correctly', () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 1000000n,
                                outputAmountRaw: 0n,
                            } as Path,
                        ],
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
                        paths: [
                            {
                                ...pathWithBuffers,
                                inputAmountRaw: 0n,
                                outputAmountRaw: 10000000000000000000n,
                            } as Path,
                        ],
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
        });
    });
});
