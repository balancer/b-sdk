/**
 * Example showing how to swap auraBal which has its own setup via AuraBalSwap.
 * Note - this is only supported on Balancer V2 and on mainnet.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/swaps/auraBalSwap.ts
 */
import { createTestClient, http, publicActions, walletActions } from 'viem';
import {
    BALANCER_RELAYER,
    ChainId,
    CHAINS,
    Relayer,
    Slippage,
    AuraBalSwap,
    Token,
    TokenAmount,
    SwapKind,
    isAuraBalSwap,
} from '../../src';

import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { exit } from 'node:process';

const auraBalSwap = async ({ rpcUrl, client, userAccount, chainId }) => {
    const tokenIn = new Token(
        ChainId.MAINNET,
        '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
        18,
    );

    const tokenOut = new Token(
        ChainId.MAINNET,
        '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d', // auraBal
        18,
    );

    const swapAmount = TokenAmount.fromHumanAmount(tokenIn, '1');
    const kind = SwapKind.GivenIn;

    // Check if tokenIn>tokenOut is an AuraBalSwap
    // Only supports auraBal <> BAL/WETH/ETH on mainnet and ExactIn only
    const isAuraBalSwapCheck = isAuraBalSwap({
        tokenIn,
        tokenOut,
        swapAmount,
        kind,
    });

    if (!isAuraBalSwapCheck) {
        console.log('Non-AuraBalSwap: Normal Swap service can be used.');
        exit();
    }

    // Create AuraBalSwap instance which can be used to query & buildCalls
    const auraBalSwap = new AuraBalSwap(rpcUrl as string);

    // Queries onchain to get result
    const queryOutput = await auraBalSwap.query({
        tokenIn,
        tokenOut,
        swapAmount,
        kind,
    });

    console.log(
        `Amount in: ${queryOutput.inputAmount.amount} (${queryOutput.inputAmount.token.address})`,
    );
    console.log(
        `Expected amount out: ${queryOutput.expectedAmountOut.amount} (${queryOutput.expectedAmountOut.token.address})`,
    );

    // auraBal swaps must be submitted via the V2 Relayer because it includes joins/exits
    // relayer approval signature can be used to provide better UX
    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        userAccount,
        client,
    );

    const slippage = Slippage.fromPercentage('1'); // 1%

    // Build callData that can be submitted
    const call = auraBalSwap.buildCall({
        queryOutput,
        slippage,
        wethIsEth: false,
        user: userAccount,
        relayerApprovalSignature,
    });
    console.log(
        `Min Amount Out: ${call.minAmountOut.amount} based off slippage of ${slippage.percentage}%`,
    );

    return {
        call,
        inputAmount: swapAmount,
        outputAmount: queryOutput.expectedAmountOut,
    };
};

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;

    // This example requires the account to sign relayer approval
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const userAccount = (await client.getAddresses())[0];

    const { call, inputAmount, outputAmount } = await auraBalSwap({
        rpcUrl,
        client,
        chainId,
        userAccount,
    });

    await makeForkTx(
        call,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: [
                {
                    address: inputAmount.token.address,
                    slot: getSlot(chainId, inputAmount.token.address),
                    rawBalance: inputAmount.amount,
                },
            ],
        },
        [inputAmount.token.address, outputAmount.token.address],
        2,
    );
}

export default runAgainstFork;
