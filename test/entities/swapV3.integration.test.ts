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
    Slippage,
    Swap,
    BALANCER_ROUTER,
    ZERO_ADDRESS,
    SwapBuildOutputExactOut,
    NATIVE_ASSETS,
    SwapBuildOutputExactIn,
} from '../../src';
import { forkSetup, sendTransactionGetBalances } from '../lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import { SwapV3 } from '@/entities/swap/swapV3';

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
                wethIsEth: false,
            });

            const updated = await swap.query(rpcUrl);

            const wethToken = new Token(
                chainId,
                TOKENS[chainId].WETH.address,
                TOKENS[chainId].WETH.decimals,
            );
            expect(updated.token).to.deep.eq(wethToken);
            expect(updated.amount).to.eq(25115489n);
        });
        test('GivenOut', async () => {
            const swap = new SwapV3({
                chainId,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenOut,
                wethIsEth: false,
            });

            const updated = await swap.query(rpcUrl);

            const balToken = new Token(
                chainId,
                TOKENS[chainId].BAL.address,
                TOKENS[chainId].BAL.decimals,
            );
            expect(updated.token).to.deep.eq(balToken);
            expect(updated.amount).to.eq(398002113381361n);
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
                await assertSwapExactIn(client, chainId, swap, false);
            });
            test('GivenOut', async () => {
                const swap = new Swap({
                    ...swapParams,
                    swapKind: SwapKind.GivenOut,
                });
                await assertSwapExactOut(client, chainId, swap, false);
            });
        });
        describe('wethIsEth: true', () => {
            describe('eth out', async () => {
                test('GivenIn', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathBalWeth],
                        swapKind: SwapKind.GivenIn,
                        wethIsEth: true,
                    });
                    await assertSwapExactIn(client, chainId, swap, true);
                });
                test('GivenOut', async () => {
                    const swap = new Swap({
                        chainId,
                        paths: [pathBalWeth],
                        swapKind: SwapKind.GivenOut,
                        wethIsEth: true,
                    });
                    await assertSwapExactOut(client, chainId, swap, true);
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
                        wethIsEth: true,
                    });
                    await assertSwapExactIn(client, chainId, swap, true);
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
                        wethIsEth: true,
                    });
                    await assertSwapExactOut(client, chainId, swap, true);
                });
            });
        });
    });
});

async function assertSwapExactIn(
    client: Client & PublicActions & TestActions & WalletActions,
    chainId: ChainId,
    swap: Swap,
    wethIsEth: boolean,
) {
    const testAddress = (await client.getAddresses())[0];
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n;

    const expectedAmountOut = await swap.query(rpcUrl);
    expect(expectedAmountOut.amount > 0n).to.be.true;
    const call = swap.buildCall({
        slippage,
        deadline,
        expectedAmountOut,
    }) as SwapBuildOutputExactIn;

    const isEthInput =
        wethIsEth &&
        swap.inputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);

    const expectedValue = isEthInput ? swap.inputAmount.amount : 0n;

    expect(call.to).to.eq(BALANCER_ROUTER[chainId]);
    expect(call.value).to.eq(expectedValue);
    // send swap transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ZERO_ADDRESS,
                swap.inputAmount.token.address,
                swap.outputAmount.token.address,
            ],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );

    expect(transactionReceipt.status).to.eq('success');

    const isEthOutput =
        wethIsEth &&
        swap.outputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);
    let expectedEthDelta = 0n;
    let expectedTokenInDelta = swap.inputAmount.amount;
    let expectedTokenOutDelta = expectedAmountOut.amount;
    if (isEthInput) {
        // Should send eth instead of tokenIn (weth)
        expectedEthDelta = swap.inputAmount.amount;
        expectedTokenInDelta = 0n;
    }
    if (isEthOutput) {
        // should receive eth instead of tokenOut (weth)
        expectedEthDelta = expectedAmountOut.amount;
        expectedTokenOutDelta = 0n;
    }

    expect(balanceDeltas).to.deep.eq([
        expectedEthDelta,
        expectedTokenInDelta,
        expectedTokenOutDelta,
    ]);
}

async function assertSwapExactOut(
    client: Client & PublicActions & TestActions & WalletActions,
    chainId: ChainId,
    swap: Swap,
    wethIsEth: boolean,
) {
    const testAddress = (await client.getAddresses())[0];
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n;

    const expectedAmountIn = await swap.query(rpcUrl);
    expect(expectedAmountIn.amount > 0n).to.be.true;
    const call = swap.buildCall({
        slippage,
        deadline,
        expectedAmountIn,
    }) as SwapBuildOutputExactOut;

    const isEthInput =
        wethIsEth &&
        swap.inputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);

    // Caller must send amountIn + slippage if ETH
    const expectedValue = isEthInput ? call.maxAmountIn.amount : 0n;

    expect(call.to).to.eq(BALANCER_ROUTER[chainId]);
    expect(call.value).to.eq(expectedValue);
    // send swap transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ZERO_ADDRESS,
                swap.inputAmount.token.address,
                swap.outputAmount.token.address,
            ],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );

    expect(transactionReceipt.status).to.eq('success');

    const isEthOutput =
        wethIsEth &&
        swap.outputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);
    let expectedEthDelta = 0n;
    let expectedTokenInDelta = expectedAmountIn.amount;
    let expectedTokenOutDelta = swap.outputAmount.amount;
    if (isEthInput) {
        // Should send eth instead of tokenIn (weth)
        expectedEthDelta = expectedAmountIn.amount;
        expectedTokenInDelta = 0n;
    }
    if (isEthOutput) {
        // should receive eth instead of tokenOut (weth)
        expectedEthDelta = swap.outputAmount.amount;
        expectedTokenOutDelta = 0n;
    }

    expect(balanceDeltas).to.deep.eq([
        expectedEthDelta,
        expectedTokenInDelta,
        expectedTokenOutDelta,
    ]);
}
