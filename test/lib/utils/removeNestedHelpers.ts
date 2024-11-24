import { Address, TestActions } from 'viem';
import {
    AddLiquidityNested,
    AddLiquidityNestedQueryOutputV3,
    NestedPoolState,
    Slippage,
    Token,
    TokenAmount,
} from '@/entities';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    ChainId,
    PERMIT2,
    PublicWalletClient,
} from '@/utils';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    sendTransactionGetBalances,
    setTokenBalances,
} from './helper';

// AddLiquidityNestedInput

export async function GetNestedBpt(
    chainId: ChainId,
    rpcUrl: string,
    testAddress: Address,
    client: PublicWalletClient & TestActions,
    nestedPoolState: NestedPoolState,
    amountsIn: {
        address: Address;
        rawAmount: bigint;
        decimals: number;
        slot: number;
    }[],
): Promise<bigint> {
    await setTokenBalances(
        client,
        testAddress,
        amountsIn.map((t) => t.address),
        amountsIn.map((t) => t.slot),
        amountsIn.map((t) => t.rawAmount),
    );

    const addLiquidityInput = {
        amountsIn,
        chainId,
        rpcUrl,
    };

    const addLiquidityNested = new AddLiquidityNested();

    for (const amount of addLiquidityInput.amountsIn) {
        // Approve Permit2 to spend account tokens
        await approveSpenderOnToken(
            client,
            testAddress,
            amount.address,
            PERMIT2[chainId],
        );
        // Approve Router to spend account tokens using Permit2
        await approveSpenderOnPermit2(
            client,
            testAddress,
            amount.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );
    }

    const queryOutput = (await addLiquidityNested.query(
        addLiquidityInput,
        nestedPoolState,
    )) as AddLiquidityNestedQueryOutputV3;

    const addLiquidityBuildInput = {
        ...queryOutput,
        slippage: Slippage.fromPercentage('1'), // 1%,
    };

    const addLiquidityBuildCallOutput = addLiquidityNested.buildCall(
        addLiquidityBuildInput,
    );

    // send add liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [queryOutput.bptOut.token.address],
            client,
            testAddress,
            addLiquidityBuildCallOutput.to,
            addLiquidityBuildCallOutput.callData,
            addLiquidityBuildCallOutput.value,
        );
    expect(transactionReceipt.status).is.eq('success');
    expect(balanceDeltas[0] > 0n).is.true;

    for (const amount of addLiquidityInput.amountsIn) {
        // Approve Permit2 to spend account tokens
        await approveSpenderOnToken(
            client,
            testAddress,
            amount.address,
            PERMIT2[chainId],
            0n,
        );
        // Approve Router to spend account tokens using Permit2
        await approveSpenderOnPermit2(
            client,
            testAddress,
            amount.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            0n,
        );
    }
    return balanceDeltas[0];
}

const isSameToken = (token1: Token, token2: Token): boolean => {
    return (
        token1.address.toLowerCase() === token2.address.toLowerCase() &&
        token1.chainId === token2.chainId
    );
};

/**
 * Tests that each amount is:
 * - >0
 * - Exists in tokens (and that all tokens have a value)
 * - No duplicates
 * @param amounts
 * @param tokens
 */
export const validateTokenAmounts = (
    amounts: TokenAmount[],
    tokens: Token[],
): void => {
    // Check that we have the same number of amounts as main tokens
    expect(amounts.length).to.equal(
        tokens.length,
        'Number of output amounts should match number of main tokens',
    );

    // Keep track of used tokens to ensure no duplicates
    const usedTokens = new Set<string>();

    // Check each amount
    amounts.forEach((amount) => {
        // Check amount is greater than 0
        expect(amount.amount > 0n).to.be.true;

        // Check token is in mainTokens
        const foundToken = tokens.some((mainToken) =>
            isSameToken(mainToken, amount.token),
        );
        expect(foundToken).to.be.true;

        // Check for duplicates
        const tokenKey = `${
            amount.token.chainId
        }-${amount.token.address.toLowerCase()}`;
        expect(usedTokens.has(tokenKey)).to.be.false;
        usedTokens.add(tokenKey);
    });

    // Verify all main tokens are present
    tokens.forEach((mainToken) => {
        const tokenExists = amounts.some((amount) =>
            isSameToken(amount.token, mainToken),
        );
        expect(tokenExists).to.be.true;
    });
};
