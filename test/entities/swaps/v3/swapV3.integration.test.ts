// pnpm test test/entities/swaps/v3/swapV3.integration.test.ts
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
    Swap,
    PERMIT2,
    PublicWalletClient,
} from '@/index';
import { Path } from '@/entities/swap/paths/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

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

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC_DAI_BPT = POOLS[chainId].MOCK_USDC_DAI_POOL;

describe('SwapV3', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;
    let pathBalWeth: Path;
    let pathMultiSwap: Path;
    let pathWithExit: Path;
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

        const fork = await startFork(ANVIL_NETWORKS.SEPOLIA);
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
                            contractToCall: AddressProvider.Router(chainId),
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
                            contractToCall: AddressProvider.Router(chainId),
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
                            contractToCall: AddressProvider.Router(chainId),
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
                            contractToCall: AddressProvider.Router(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
                                contractToCall:
                                    AddressProvider.BatchRouter(chainId),
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
