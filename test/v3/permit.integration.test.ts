// pnpm test -- v3/permit.integration.test.ts
import { config } from 'dotenv';
config();

import {
    Address,
    Client,
    createTestClient,
    http,
    parseEther,
    parseUnits,
    PublicActions,
    publicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    BALANCER_BATCH_ROUTER,
    BALANCER_ROUTER,
    ChainId,
    CHAINS,
    Hex,
    Path,
    PERMIT2,
    PoolState,
    PoolType,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityProportionalInput,
    Slippage,
    Swap,
    swapETHBuildCallWithPermit2Error,
    SwapInput,
    SwapKind,
} from 'src';

import {
    ANVIL_NETWORKS,
    startFork,
    stopAnvilFork,
} from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    approveSpenderOnTokens,
    assertAddLiquidityUnbalanced,
    assertRemoveLiquidityProportional,
    assertSwapExactIn,
    assertSwapExactOut,
    doAddLiquidity,
    doRemoveLiquidity,
    POOLS,
    RemoveLiquidityTxInput,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const usePermit2Signatures = true;
const usePermitSignatures = true;

const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;
const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;
const USDC = TOKENS[chainId].USDC;
const DAI = TOKENS[chainId].DAI;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;

describe('permit and permit2 integration tests', () => {
    let rpcUrl: string;
    let poolState: PoolState;
    let testAddress: Address;
    let client: Client & TestActions & WalletActions & PublicActions;
    let addLiquidityTxInput: AddLiquidityTxInput;
    let removeLiquidityTxInput: RemoveLiquidityTxInput;
    let addLiquidityInput: AddLiquidityUnbalancedInput;
    let removeLiquidityInput: RemoveLiquidityProportionalInput;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);
    });

    // reset fork
    beforeEach(async () => {
        await stopAnvilFork(ANVIL_NETWORKS.SEPOLIA);
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        const tokens = [...poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );
    });

    describe('add and remove liquidity tests', () => {
        // TODO: test add/remove with ETH?
        // TODO: move tests to add/remove/swap integration tests so we make sure we're testing all possible scenarios - will help catch maxAmountsIn issues for example

        test('add liquidity with permit2, then remove liquidity using permit', async () => {
            addLiquidityInput = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn: poolState.tokens.map((t) => ({
                    rawAmount: parseUnits('10', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                })),
            };

            removeLiquidityInput = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Proportional,
                bptIn: {
                    rawAmount: parseEther('0.1'),
                    decimals: 18,
                    address: poolState.address,
                },
            };

            addLiquidityTxInput = {
                client,
                addLiquidity: new AddLiquidity(),
                slippage: Slippage.fromPercentage('1'), // 1%
                poolState,
                testAddress,
                addLiquidityInput,
            };

            removeLiquidityTxInput = {
                client,
                removeLiquidity: new RemoveLiquidity(),
                slippage: Slippage.fromPercentage('1'), // 1%
                poolState,
                testAddress,
                removeLiquidityInput,
            };

            const addLiquidityOutput = await doAddLiquidity({
                ...addLiquidityTxInput,
                addLiquidityInput,
                usePermit2Signatures,
            });

            assertAddLiquidityUnbalanced(
                addLiquidityTxInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                addLiquidityTxInput.slippage,
                protocolVersion,
            );

            const removeLiquidityOutput = await doRemoveLiquidity({
                ...removeLiquidityTxInput,
                removeLiquidityInput,
                usePermitSignatures,
            });

            assertRemoveLiquidityProportional(
                removeLiquidityTxInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                removeLiquidityTxInput.slippage,
                protocolVersion,
            );
        });
    });

    describe('single swap tests', () => {
        let pathBalWeth: Path;
        let swapParams: SwapInput;

        beforeEach(async () => {
            // weth > bal
            pathBalWeth = {
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

            swapParams = {
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenIn,
            };
        });

        describe('wethIsEth: false', () => {
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
                    usePermit2Signatures,
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
                    usePermit2Signatures,
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
                        true,
                        usePermit2Signatures,
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
                    ).rejects.toThrowError(swapETHBuildCallWithPermit2Error);
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
                    await expect(() =>
                        assertSwapExactOut(
                            BALANCER_ROUTER[chainId],
                            client,
                            rpcUrl,
                            chainId,
                            swap,
                            true,
                            usePermit2Signatures,
                        ),
                    ).rejects.toThrowError(swapETHBuildCallWithPermit2Error);
                });
            });
        });
    });

    describe.skip('multi-hop swap tests', () => {
        let pathMultiSwap: Path;
        let pathWithExit: Path;
        let swapParams: SwapInput;

        beforeEach(async () => {
            // weth > bal > dai > usdc
            pathMultiSwap = {
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
            pathWithExit = {
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

            swapParams = {
                chainId,
                paths: [pathMultiSwap, pathWithExit],
                swapKind: SwapKind.GivenIn,
            };
        });

        describe('wethIsEth: false', () => {
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
            test('GivenIn', async () => {
                const swap = new Swap({
                    ...swapParams,
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
                    ),
                ).rejects.toThrowError(swapETHBuildCallWithPermit2Error);
            });
            test('GivenOut', async () => {
                const swap = new Swap({
                    ...swapParams,
                    swapKind: SwapKind.GivenOut,
                });
                await expect(() =>
                    assertSwapExactOut(
                        BALANCER_BATCH_ROUTER[chainId],
                        client,
                        rpcUrl,
                        chainId,
                        swap,
                        true,
                    ),
                ).rejects.toThrowError(swapETHBuildCallWithPermit2Error);
            });
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: WETH.address,
                decimals: WETH.decimals,
                index: 0,
            },
            {
                address: BAL.address,
                decimals: BAL.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Weighted,
            tokens,
            protocolVersion,
        };
    }
}

/******************************************************************************/
