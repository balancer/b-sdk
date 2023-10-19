import { ExitTxInput } from './types';
import { replaceWrapped, Token } from '../../../src';
import { sendTransactionGetBalances } from './helper';
import { expect } from 'vitest';

export const doExit = async (txInput: ExitTxInput) => {
    const {
        poolExit,
        poolInput,
        exitInput,
        testAddress,
        client,
        slippage,
        checkNativeBalance,
        chainId,
    } = txInput;
    const queryResult = await poolExit.query(exitInput, poolInput);
    const { call, to, value, maxBptIn, minAmountsOut } = poolExit.buildCall({
        ...queryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });

    const poolTokens = poolInput.tokens.map(
        (t) => new Token(chainId, t.address, t.decimals),
    );

    const bptIndex = poolInput.tokens.findIndex(
        (t) => t.address === poolInput.address,
    );
    // Replace with native asset if required
    const poolTokensAddr = checkNativeBalance
        ? replaceWrapped(poolTokens, chainId).map((t) => t.address)
        : poolTokens.map((t) => t.address);

    let tokensForBalanceCheck;
    if (bptIndex < 0) {
        tokensForBalanceCheck = [...poolTokensAddr, poolInput.address];
    } else {
        tokensForBalanceCheck = [...poolTokensAddr];
    }

    // send transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokensForBalanceCheck,
            client,
            testAddress,
            to,
            call,
            value,
        );
    expect(transactionReceipt.status).to.eq('success');

    let expectedDeltas;

    if (bptIndex < 0) {
        expectedDeltas = [
            ...queryResult.amountsOut.map((a) => a.amount),
            queryResult.bptIn.amount,
        ];
    } else {
        expectedDeltas = [
            ...queryResult.amountsOut.slice(0, bptIndex).map((a) => a.amount),
            queryResult.bptIn.amount,
            ...queryResult.amountsOut.slice(bptIndex + 1).map((a) => a.amount),
        ];
    }

    // Confirm final balance changes match query result
    expect(expectedDeltas).to.deep.eq(balanceDeltas);

    return {
        queryResult,
        maxBptIn,
        minAmountsOut,
    };
};
