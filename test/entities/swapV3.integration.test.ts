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
} from '../../src';
import { forkSetup } from '../lib/utils/helper';
import {
    ANVIL_NETWORKS,
    startFork,
    stopAnvilFork,
} from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';
import { Path } from '@/entities/swap/paths/types';

const vaultVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo shouldn't change as checks depend on token balances
const blockNo = 6001201n;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const DAI = TOKENS[chainId].DAI;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    let rpcUrl: string;

    beforeEach(async () => {
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
            [WETH.address, BAL.address, USDC.address],
            // [WETH.slot as number, BAL.slot as number, undefined],
            [WETH.slot as number, BAL.slot as number, USDC.slot as number],
            [parseEther('100'), parseEther('100'), 100000000n],
            undefined,
            vaultVersion,
        );
    });

    describe('single swap', () => {
        const pathBalWeth: Path = {
            vaultVersion: 3,
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
                expect(expected.expectedAmountOut.token).to.deep.eq(wethToken);
                expect(expected.expectedAmountOut.amount).to.eq(103365122n);
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
                expect(expected.expectedAmountIn.amount).to.eq(96734829986472n);
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
            vaultVersion: 3,
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
            vaultVersion: 3,
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
                expect(expected.pathAmounts).to.deep.eq([90214n, 770252n]);
                expect(expected.expectedAmountOut.token).to.deep.eq(usdcToken);
                expect(expected.expectedAmountOut.amount).to.eq(860466n);
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
                    2286265697052729n,
                    831382813409707n,
                ]);
                expect(expected.expectedAmountIn.token).to.deep.eq(wethToken);
                expect(expected.expectedAmountIn.amount).to.eq(
                    3117648510462436n,
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
