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
} from 'viem';
import {
    CHAINS,
    ChainId,
    SwapKind,
    Token,
    Swap,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    VAULT_V2,
    Path,
    PublicWalletClient,
} from '@/index';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { forkSetup } from 'test/lib/utils/helper';
import { TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';

const protocolVersion = 2;
const chainId = ChainId.MAINNET;
const blockNo = 18980070n;

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET, undefined, blockNo);

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const vault = VAULT_V2[chainId];

describe('SwapV2', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
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
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];
    });

    beforeEach(async () => {
        await forkSetup(
            client,
            testAddress,
            [WETH.address, BAL.address],
            [WETH.slot as number, BAL.slot as number],
            [parseEther('100'), parseEther('100')],
            undefined,
            protocolVersion,
        );
    });

    describe('query method should return correct updated', () => {
        test('GivenIn', async () => {
            const swap = new Swap({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenIn,
            });

            const updated = (await swap.query(rpcUrl)) as ExactInQueryOutput;

            const wethToken = new Token(
                chainId,
                TOKENS[chainId].WETH.address,
                TOKENS[chainId].WETH.decimals,
            );
            expect(updated.expectedAmountOut.token).to.deep.eq(wethToken);
            expect(updated.expectedAmountOut.amount).to.eq(44236888n);
        });
        test('GivenOut', async () => {
            const swap = new Swap({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenOut,
            });

            const updated = (await swap.query(rpcUrl)) as ExactOutQueryOutput;

            const balToken = new Token(
                chainId,
                TOKENS[chainId].BAL.address,
                TOKENS[chainId].BAL.decimals,
            );
            expect(updated.expectedAmountIn.token).to.deep.eq(balToken);
            expect(updated.expectedAmountIn.amount).to.eq(60635225778147n);
        });
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
