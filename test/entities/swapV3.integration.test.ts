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
    Path,
    Token,
    Swap,
    ExpectedExactIn,
    ExpectedExactOut,
} from '../../src';
import { forkSetup } from '../lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import { SwapV3 } from '@/entities/swap/swapV3';
import {
    assertSwapExactIn,
    assertSwapExactOut,
} from 'test/lib/utils/swapHelpers';

const balancerVersion = 3;
const chainId = ChainId.SEPOLIA;
// blockNo with guaranteed liquidity
const blockNo = 5287755n;

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA, undefined, blockNo);

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    const pathBalWeth: Path = {
        balancerVersion: 3,
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
            balancerVersion,
        );
    });

    describe('query method should return correct updated', () => {
        test('GivenIn', async () => {
            const swap = new SwapV3({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenIn,
            });

            const expected = (await swap.query(rpcUrl)) as ExpectedExactIn;

            const wethToken = new Token(
                chainId,
                TOKENS[chainId].WETH.address,
                TOKENS[chainId].WETH.decimals,
            );
            expect(expected.expectedAmountOut.token).to.deep.eq(wethToken);
            expect(expected.expectedAmountOut.amount).to.eq(25115489n);
        });
        test('GivenOut', async () => {
            const swap = new SwapV3({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenOut,
            });

            const expected = (await swap.query(rpcUrl)) as ExpectedExactOut;

            const balToken = new Token(
                chainId,
                TOKENS[chainId].BAL.address,
                TOKENS[chainId].BAL.decimals,
            );
            expect(expected.expectedAmountIn.token).to.deep.eq(balToken);
            expect(expected.expectedAmountIn.amount).to.eq(398002113381361n);
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
