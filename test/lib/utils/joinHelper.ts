import { replaceWrapped, Token } from '../../../src';
import { sendTransactionGetBalances } from './helper';
import { expect } from 'vitest';
import { JoinTxInput } from './types';

export const doJoin = async (txInput: JoinTxInput) => {
    const {
        poolJoin,
        poolInput,
        joinInput,
        testAddress,
        client,
        slippage,
        checkNativeBalance,
        chainId,
    } = txInput;
    const queryResult = await poolJoin.query(joinInput, poolInput);
    const { call, to, value, maxAmountsIn, minBptOut } = poolJoin.buildCall({
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
    let tokensForBalanceCheck; // Replace with native asset if required
    const poolTokensAddr = checkNativeBalance
        ? replaceWrapped(poolTokens, chainId).map((t) => t.address)
        : poolTokens.map((t) => t.address);
    if (bptIndex >= 0) {
        tokensForBalanceCheck = [...poolTokensAddr];
    } else {
        tokensForBalanceCheck = [...poolTokensAddr, poolInput.address];
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
    if (bptIndex >= 0) {
        expectedDeltas = [
            ...queryResult.amountsIn.slice(0, bptIndex).map((a) => a.amount),
            queryResult.bptOut.amount,
            ...queryResult.amountsIn.slice(bptIndex + 1).map((a) => a.amount),
        ];
    } else {
        expectedDeltas = [
            ...queryResult.amountsIn.map((a) => a.amount),
            queryResult.bptOut.amount,
        ];
    }
    // Confirm final balance changes match query result
    expect(expectedDeltas).to.deep.eq(balanceDeltas);

    return {
        queryResult,
        maxAmountsIn,
        minBptOut,
        value,
    };
};
