// pnpm test -- auraBal.integration.test.ts
import {
    createTestClient,
    Hex,
    http,
    publicActions,
    TestActions,
    walletActions,
    zeroAddress,
} from 'viem';

import {
    Relayer,
    Slippage,
    Token,
    TokenAmount,
    AuraBalSwap,
    CHAINS,
    NATIVE_ASSETS,
    SwapKind,
    ChainId,
    PublicWalletClient,
} from '@/index';
import { BALANCER_RELAYER } from '@/utils/constantsV2';

import {
    auraBalToken,
    BAL,
} from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { forkSetup, sendTransactionGetBalances } from 'test/lib/utils';

const chainId = ChainId.MAINNET;
const bal = new Token(chainId, BAL, 18);
const weth = new Token(chainId, NATIVE_ASSETS[chainId].wrapped, 18);

describe('auraBalSwaps:Integration tests', () => {
    let rpcUrl: string;
    let snapshot: Hex;
    let client: PublicWalletClient & TestActions;

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('to auraBal', () => {
        test('from bal', async () => {
            await testAuraBalSwap(client, bal, auraBalToken, 1, rpcUrl);
        });

        test('from weth', async () => {
            await testAuraBalSwap(client, weth, auraBalToken, 3, rpcUrl);
        });
        test('from weth, wethIsEth=true', async () => {
            await testAuraBalSwap(client, weth, auraBalToken, 3, rpcUrl, true);
        });
    });

    describe('from auraBal', () => {
        test('to bal', async () => {
            await testAuraBalSwap(client, auraBalToken, bal, 0, rpcUrl);
        });

        test('to weth', async () => {
            await testAuraBalSwap(client, auraBalToken, weth, 0, rpcUrl);
        });

        test('to weth, wethIsEth=true', async () => {
            await testAuraBalSwap(client, auraBalToken, weth, 0, rpcUrl, true);
        });
    });
});

async function testAuraBalSwap(
    client: PublicWalletClient & TestActions,
    tokenIn: Token,
    tokenOut: Token,
    tokenInSlot: number,
    rpcUrl: string,
    wethIsEth = false,
) {
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

    expect(transactionReceipt.status).to.equal('success');

    if (
        wethIsEth &&
        tokenIn.isUnderlyingEqual(NATIVE_ASSETS[ChainId.MAINNET])
    ) {
        expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[2]);
        expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
        expect(call.value).to.eq(queryOutput.inputAmount.amount);
        expect(balanceDeltas[0]).to.eq(0n);
    } else if (
        wethIsEth &&
        tokenOut.isUnderlyingEqual(NATIVE_ASSETS[ChainId.MAINNET])
    ) {
        expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[0]);
        expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[2]);
        expect(call.value).to.eq(0n);
        expect(balanceDeltas[1]).to.eq(0n);
    } else {
        expect(queryOutput.inputAmount.amount).to.equal(balanceDeltas[0]);
        expect(queryOutput.expectedAmountOut.amount).to.equal(balanceDeltas[1]);
        expect(call.value).to.eq(0n);
        expect(balanceDeltas[2]).to.eq(0n);
    }
}
