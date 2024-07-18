// pnpm test -- v3/permit.integration.test.ts
import { config } from 'dotenv';
config();

import {
    Address,
    Client,
    createTestClient,
    http,
    parseUnits,
    PublicActions,
    publicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    BALANCER_BATCH_ROUTER,
    BALANCER_ROUTER,
    ChainId,
    CHAINS,
    Hex,
    Path,
    PERMIT2,
    PoolState,
    PoolType,
    Swap,
    buildCallWithPermit2ETHError,
    SwapInput,
    SwapKind,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnTokens,
    assertSwapExactIn,
    assertSwapExactOut,
    POOLS,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const usePermit2Signatures = true;

const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;
const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;
const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;
// const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;

describe('permit and permit2 integration tests', () => {
    let rpcUrl: string;
    let poolState: PoolState;
    let testAddress: Address;
    let client: Client & TestActions & WalletActions & PublicActions;
    let snapshot: Hex;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

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

        // Uses Special RPC methods to revert state back to same snapshot for each test
        snapshot = await client.snapshot();
    });

    // reset fork
    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
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
                    ).rejects.toThrowError(buildCallWithPermit2ETHError);
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
                    ).rejects.toThrowError(buildCallWithPermit2ETHError);
                });
            });
        });
    });

    describe('multi-hop swap tests', () => {
        let pathMultiSwap: Path;
        // let pathWithExit: Path;
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
            // pathWithExit = {
            //     protocolVersion: 3,
            //     tokens: [
            //         {
            //             address: WETH.address,
            //             decimals: WETH.decimals,
            //         },
            //         {
            //             address: USDC_DAI_BPT.address,
            //             decimals: USDC_DAI_BPT.decimals,
            //         },
            //         {
            //             address: USDC.address,
            //             decimals: USDC.decimals,
            //         },
            //     ],
            //     pools: [
            //         POOLS[chainId].MOCK_NESTED_POOL.id,
            //         POOLS[chainId].MOCK_USDC_DAI_POOL.id,
            //     ],
            //     inputAmountRaw: 100000000000000n,
            //     outputAmountRaw: 6000000n,
            // };

            swapParams = {
                chainId,
                paths: [pathMultiSwap], // TODO: add poolWithExit after it's seeded with liquidity by the data team
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
                    true,
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
                    true,
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
                        true,
                    ),
                ).rejects.toThrowError(buildCallWithPermit2ETHError);
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
                        true,
                    ),
                ).rejects.toThrowError(buildCallWithPermit2ETHError);
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
