// pnpm test -- auraBal.integration.test.ts
import { createTestClient, http, publicActions, walletActions } from 'viem';
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
        // '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56' has slot 0
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
        wethIsEth: false,
        user: testAddress,
        relayerApprovalSignature,
    });

    // let tokensIn = queryOutput.amountsIn.map((a) => a.token);
    // if (wethIsEth) {
    //     tokensIn = replaceWrapped(tokensIn, chainId);
    // }

    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [tokenIn.address, tokenOut.address],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );
    expect(transactionReceipt.status).to.equal('success');
    expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[0]);
    expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
}
