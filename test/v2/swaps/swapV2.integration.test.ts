// pnpm test -- swapV2.integration.test.ts
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
    VAULT_V2,
    Path,
    PublicWalletClient,
} from '@/index';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    assertSwapExactIn,
    assertSwapExactOut,
    forkSetup,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 2;
const chainId = ChainId.MAINNET;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const vault = VAULT_V2[chainId];

describe('SwapV2', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;

    const pathBalWeth: Path = {
        protocolVersion: 2,
        tokens: [
            {
                address: TOKENS[chainId].BAL.address,
                decimals: TOKENS[chainId].BAL.decimals,
            },
            {
                address: TOKENS[chainId].WETH.address,
                decimals: TOKENS[chainId].WETH.decimals,
            },
        ],
        pools: [
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        ],
        inputAmountRaw: 100000000000n,
        outputAmountRaw: 100000000000n,
    };

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

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
            [WETH.address, BAL.address],
            [WETH.slot as number, BAL.slot as number],
            [parseEther('100'), parseEther('100')],
            undefined,
            protocolVersion,
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('swap should be executed correcly', () => {
        describe('wethIsEth: false', () => {
            const wethIsEth = false;
            const swapParams = {
                chainId,
                paths: [pathBalWeth],
            };
            test('GivenIn', async () => {
                const swap = new Swap({
                    ...swapParams,
                    swapKind: SwapKind.GivenIn,
                });
                await assertSwapExactIn({
                    contractToCall: vault,
                    client,
                    rpcUrl,
                    chainId,
                    swap,
                    wethIsEth,
                });
            });
            test('GivenOut', async () => {
                const swap = new Swap({
                    ...swapParams,
                    swapKind: SwapKind.GivenOut,
                });
                await assertSwapExactOut({
                    contractToCall: vault,
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
            describe('eth out', async () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathBalWeth],
                        swapKind: SwapKind.GivenIn,
                    });
                    await assertSwapExactIn({
                        contractToCall: vault,
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
                        paths: [pathBalWeth],
                        swapKind: SwapKind.GivenOut,
                    });
                    await assertSwapExactOut({
                        contractToCall: vault,
                        client,
                        rpcUrl,
                        chainId,
                        swap,
                        wethIsEth,
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
                        contractToCall: vault,
                        client,
                        rpcUrl,
                        chainId,
                        swap,
                        wethIsEth,
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
                        contractToCall: vault,
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
});
