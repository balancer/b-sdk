// pnpm test -- auraBal.integration.test.ts
import { createTestClient, http, publicActions, walletActions } from 'viem';
import { Relayer, Slippage, Token, TokenAmount } from '@/entities';
import {
    AuraBalSwap,
    AuraBalSwapKind,
} from '@/entities/swap/swaps/v2/auraBalSwaps/auraBalSwaps';
import { BALANCER_RELAYER, CHAINS, NATIVE_ASSETS } from '@/utils';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { forkSetup, sendTransactionGetBalances } from 'test/lib/utils';
import {
    auraBAL,
    auraBalToken,
    BAL,
} from '@/entities/swap/swaps/v2/auraBalSwaps/constants';

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
            await testToAuraBal(bal, 1, rpcUrl);
        });

        test('from weth', async () => {
            await testToAuraBal(weth, 3, rpcUrl);
        });
    });

    describe('from auraBal', () => {
        test('to bal', async () => {
            await testFromAuraBal(bal, rpcUrl);
        });

        test('to weth', async () => {
            await testFromAuraBal(weth, rpcUrl);
        });
    });
});

async function testToAuraBal(fromToken: Token, slot: number, rpcUrl: string) {
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const testAddress = (await client.getAddresses())[0];
    const auraBalSwap = new AuraBalSwap(rpcUrl);
    const inputAmount = TokenAmount.fromHumanAmount(fromToken, '1');
    await forkSetup(
        client,
        testAddress,
        [fromToken.address],
        [slot],
        [inputAmount.amount],
        // '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56' has slot 0
    );
    const output = await auraBalSwap.query({
        inputAmount,
        swapToken: fromToken,
        kind: AuraBalSwapKind.ToAuraBal,
    });

    const slippage = Slippage.fromPercentage('1'); // 1%

    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const call = auraBalSwap.buildCall({
        queryOutput: output,
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
            [fromToken.address, auraBAL],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );
    expect(transactionReceipt.status).to.equal('success');
    expect(output.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
    expect(output.inputAmount.amount).to.equal(balanceDeltas[0]);
}

async function testFromAuraBal(toToken: Token, rpcUrl: string) {
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const testAddress = (await client.getAddresses())[0];
    const auraBalSwap = new AuraBalSwap(rpcUrl);
    const inputAmount = TokenAmount.fromHumanAmount(auraBalToken, '1');
    await forkSetup(
        client,
        testAddress,
        [auraBalToken.address],
        [0],
        [inputAmount.amount],
    );
    const queryOutput = await auraBalSwap.query({
        inputAmount,
        swapToken: toToken,
        kind: AuraBalSwapKind.FromAuraBal,
    });

    // build add liquidity call with expected minBpOut based on slippage
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

    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [auraBAL, toToken.address],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );

    expect(transactionReceipt.status).to.equal('success');
    expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
    expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[0]);
}
