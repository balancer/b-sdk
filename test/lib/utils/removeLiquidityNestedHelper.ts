import { Address, TestActions, TransactionReceipt, zeroAddress } from 'viem';
import {
    AddLiquidityNested,
    AddLiquidityNestedQueryOutputV3,
    NestedPoolState,
    RemoveLiquidityNested,
    RemoveLiquidityNestedBuildCallOutput,
    RemoveLiquidityNestedCallInputV3,
    RemoveLiquidityNestedInput,
    RemoveLiquidityNestedQueryOutput,
    RemoveLiquidityNestedQueryOutputV3,
    Slippage,
    TokenAmount,
} from '@/entities';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED,
    ChainId,
    NATIVE_ASSETS,
    PERMIT2,
    PublicWalletClient,
} from '@/utils';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    sendTransactionGetBalances,
    setTokenBalances,
} from './helper';
import { BaseToken } from '@/entities/baseToken';

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
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId],
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
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId],
            0n,
        );
    }
    return balanceDeltas[0];
}

const isSameToken = (token1: BaseToken, token2: BaseToken): boolean => {
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
    tokens: BaseToken[],
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

export type RemoveLiquidityNestedTxInput = {
    client: PublicWalletClient & TestActions;
    removeLiquidityNested: RemoveLiquidityNested;
    removeLiquidityNestedInput: RemoveLiquidityNestedInput;
    slippage: Slippage;
    nestedPoolState: NestedPoolState;
    testAddress: Address;
    wethIsEth?: boolean;
};

export type RemoveLiquidityNestedTxOutput = {
    removeLiquidityNestedQueryOutput: RemoveLiquidityNestedQueryOutput;
    removeLiquidityNestedBuildCallOutput: RemoveLiquidityNestedBuildCallOutput;
    tokenAmountsForBalanceCheck: TokenAmount[];
    txOutput: {
        transactionReceipt: TransactionReceipt;
        balanceDeltas: bigint[];
    };
};

export const doRemoveLiquidityNested = async (
    txInput: RemoveLiquidityNestedTxInput,
): Promise<RemoveLiquidityNestedTxOutput> => {
    const {
        client,
        removeLiquidityNested,
        removeLiquidityNestedInput,
        slippage,
        nestedPoolState,
        testAddress,
        wethIsEth,
    } = txInput;

    const removeLiquidityNestedQueryOutput = (await removeLiquidityNested.query(
        removeLiquidityNestedInput,
        nestedPoolState,
    )) as RemoveLiquidityNestedQueryOutputV3;

    const removeLiquidityBuildInput: RemoveLiquidityNestedCallInputV3 = {
        ...removeLiquidityNestedQueryOutput,
        slippage,
        wethIsEth,
    };

    const removeLiquidityNestedBuildCallOutput =
        removeLiquidityNested.buildCall(removeLiquidityBuildInput);

    const tokenAmountsForBalanceCheck = [
        ...removeLiquidityNestedQueryOutput.amountsOut,
        removeLiquidityNestedQueryOutput.bptAmountIn,
        // add zero address so we can check for native token balance change
        TokenAmount.fromRawAmount(
            new BaseToken(
                removeLiquidityNestedQueryOutput.chainId,
                zeroAddress,
                18,
            ),
            0n,
        ),
    ];

    // send remove liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokenAmountsForBalanceCheck.map((t) => t.token.address),
            client,
            testAddress,
            removeLiquidityNestedBuildCallOutput.to,
            removeLiquidityNestedBuildCallOutput.callData,
        );

    return {
        removeLiquidityNestedQueryOutput,
        removeLiquidityNestedBuildCallOutput,
        tokenAmountsForBalanceCheck,
        txOutput: { transactionReceipt, balanceDeltas },
    };
};

export const assertRemoveLiquidityNested = (
    output: RemoveLiquidityNestedTxOutput,
    slippage: Slippage,
    wethIsEth?: boolean,
) => {
    const {
        removeLiquidityNestedQueryOutput,
        removeLiquidityNestedBuildCallOutput,
        tokenAmountsForBalanceCheck,
        txOutput,
    } = output;

    const { transactionReceipt, balanceDeltas } = txOutput;
    const { chainId, amountsOut } = removeLiquidityNestedQueryOutput;
    const { minAmountsOut, to } = removeLiquidityNestedBuildCallOutput;

    const expectedMinAmountsOut = amountsOut.map((amountOut) =>
        slippage.applyTo(amountOut.amount, -1),
    );
    expect(expectedMinAmountsOut).to.deep.eq(
        minAmountsOut.map((a) => a.amount),
    );
    expect(to).to.eq(BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId]);

    expect(transactionReceipt.status).to.eq('success');

    // Should match user bpt amount in and query result for amounts out
    const expectedDeltas = tokenAmountsForBalanceCheck.map((t) => t.amount);

    // move native token balance to the extra index if wethIsEth
    if (wethIsEth) {
        const wethIndex = amountsOut.findIndex((a) =>
            a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
        );
        expectedDeltas[expectedDeltas.length - 1] = expectedDeltas[wethIndex];
        expectedDeltas[wethIndex] = 0n;
    }

    expect(expectedDeltas).to.deep.eq(balanceDeltas);
};
