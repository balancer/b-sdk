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
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { auraBalToken } from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { exit } from 'process';

const auraBalSwap = async ({ rpcUrl, client, userAccount, chainId }) => {
    // Create AuraBalSwap instance which can be used to query & buildCalls
    const auraBalSwap = new AuraBalSwap(rpcUrl as string);

    const tokenIn = new Token(
        1,
        '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
        18,
    );
    const inputAmount = TokenAmount.fromHumanAmount(tokenIn, '1');

    const tokenOut = auraBalToken;

    // Check if tokenIn>tokenOut is an AuraBalSwap
    // Only supports auraBal <> BAL/WETH/ETH on mainnet and ExactIn only
    const { isAuraBalSwap, kind } = auraBalSwap.isAuraBalSwap(
        tokenIn,
        tokenOut,
    );

    if (!isAuraBalSwap) {
        console.log('Non-AuraBalSwap: Normal Swap service can be used.');
        exit();
    }

    // Querys onchain to get result
    const queryOutput = await auraBalSwap.query({
        inputAmount,
        swapToken: tokenIn,
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

    return { call, inputAmount, outputAmount: queryOutput.expectedAmountOut };
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
