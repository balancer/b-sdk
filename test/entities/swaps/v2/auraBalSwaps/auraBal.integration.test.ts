// pnpm test -- auraBal.integration.test.ts
import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import { Relayer, Slippage, Token, TokenAmount } from '@/entities';
import { AuraBalSwap } from '@/entities/swap/swaps/v2/auraBalSwaps/auraBalSwaps';
import { BALANCER_RELAYER, CHAINS, NATIVE_ASSETS } from '@/utils';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { forkSetup, sendTransactionGetBalances } from 'test/lib/utils';
import {
    auraBalToken,
    BAL,
} from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { SwapKind } from '@/types';

const chainId = 1;
const bal = new Token(1, BAL, 18);
const weth = new Token(1, NATIVE_ASSETS[1].wrapped, 18);

describe('auraBalSwaps:Integration tests', () => {
    let rpcUrl: string;
    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));
    });

    describe('to auraBal', () => {
        test('from bal', async () => {
            await testAuraBalSwap(bal, auraBalToken, 1, rpcUrl);
        });

        test('from weth', async () => {
            await testAuraBalSwap(weth, auraBalToken, 3, rpcUrl);
        });
        test('from weth, wethIsEth=true', async () => {
            await testAuraBalSwap(weth, auraBalToken, 3, rpcUrl, true);
        });
    });

    describe('from auraBal', () => {
        test('to bal', async () => {
            await testAuraBalSwap(auraBalToken, bal, 0, rpcUrl);
        });

        test('to weth', async () => {
            await testAuraBalSwap(auraBalToken, weth, 0, rpcUrl);
        });
    });
});

async function testAuraBalSwap(
    tokenIn: Token,
    tokenOut: Token,
    tokenInSlot: number,
    rpcUrl: string,
    wethIsEth = false,
) {
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const testAddress = (await client.getAddresses())[0];
    const auraBalSwap = new AuraBalSwap(rpcUrl);
    const swapAmount = TokenAmount.fromHumanAmount(tokenIn, '1');
    await forkSetup(
        client,
        testAddress,
        [tokenIn.address],
        [tokenInSlot],
        [swapAmount.amount],
    );
    const queryOutput = await auraBalSwap.query({
        swapAmount,
        tokenIn,
        tokenOut,
        kind: SwapKind.GivenIn,
    });

    const slippage = Slippage.fromPercentage('1'); // 1%

    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const call = auraBalSwap.buildCall({
        queryOutput,
        slippage,
        wethIsEth,
        user: testAddress,
        relayerApprovalSignature,
    });

    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [tokenIn.address, tokenOut.address, zeroAddress],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );
    if (!wethIsEth) {
        expect(call.value).to.eq(0n);
        expect(balanceDeltas[2]).to.eq(0n);
    }
    if (wethIsEth && tokenIn.isUnderlyingEqual(NATIVE_ASSETS[1])) {
        expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[2]);
    } else expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[0]);

    expect(transactionReceipt.status).to.equal('success');
    expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
}
