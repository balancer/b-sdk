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
import { CHAINS, ChainId, SwapKind, Path, Token, Swap } from '../../src';
import { forkSetup } from '../lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';

const vaultVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo with guaranteed liquidity
const blockNo = 5490330n;

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA, undefined, blockNo);

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    const pathBalWeth: Path = {
        vaultVersion: 3,
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
        pools: [POOLS[chainId].MOCK_WEIGHTED_POOL.id],
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
            vaultVersion,
        );
    });

    describe('query method should return correct updated', () => {
        test('GivenIn', async () => {
            const swap = new Swap({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenIn,
            });

            const updated = await swap.query(rpcUrl);

            const wethToken = new Token(
                chainId,
                TOKENS[chainId].WETH.address,
                TOKENS[chainId].WETH.decimals,
            );
            expect(updated.token).to.deep.eq(wethToken);
            expect(updated.amount).to.eq(138379302n);
        });
        test('GivenOut', async () => {
            const swap = new Swap({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenOut,
            });

            const updated = await swap.query(rpcUrl);

            const balToken = new Token(
                chainId,
                TOKENS[chainId].BAL.address,
                TOKENS[chainId].BAL.decimals,
            );
            expect(updated.token).to.deep.eq(balToken);
            expect(updated.amount).to.eq(72265254280201n);
        });
    });
    describe('swap should be executed correcly', () => {
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
                await assertSwapExactIn(client, rpcUrl, chainId, swap, false);
            });
            test('GivenOut', async () => {
                const swap = new Swap({
                    ...swapParams,
                    swapKind: SwapKind.GivenOut,
                });
                await assertSwapExactOut(client, rpcUrl, chainId, swap, false);
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
