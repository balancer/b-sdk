import { ExitTxInput } from './types';
import { replaceWrapped, Token } from '../../../src';
import { sendTransactionGetBalances } from './helper';
import { expect } from 'vitest';

/**
 * Helper function that sends a exit transaction and check for balance deltas
 * @param txInput
 *     @param poolExit: PoolExit - The pool exit class, used to query the exit and build the exit call
 *     @param poolInput: PoolStateInput - The state of the pool being exited
 *     @param exitInput: ExitInput - The parameters of the exit transaction, example: bptIn, amountsOut, etc.
 *     @param testAddress: Address - The address to send the transaction from
 *     @param client: Client & PublicActions & WalletActions - The RPC client
 *     @param slippage: Slippage - The slippage tolerance for the exit transaction
 *     @param checkNativeBalance: boolean - Whether to check the native asset balance or not
 *     @param chainId: ChainId - The Chain Id of the pool being exited, for example: 1 for Mainnet, 137 for Polygon, etc.
 */
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
        /**
         * If the pool type tokens list does not contains BPT (for example: Weighted), the poolTokensAddr
         * will not have the bpt address, so we need to add it, so the balance delta of the bpt will be
         * checked in the tests.
         */
        tokensForBalanceCheck = [...poolTokensAddr, poolInput.address];
    } else {
        /*
          * If the pool type tokens list contains BPT (for example: Composable Stable), the poolTokensAddr
          * will already have the bpt address, so we don't need to add it again.
         */
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
        /*
          * If the pool type tokens list does not contains BPT (for example: Weighted), the queryResult.amountsOut
          * does not include any amount out of bpt, so we just need to add the bptIn.amount to the expectedDeltas.
         */
        expectedDeltas = [
            ...queryResult.amountsOut.map((a) => a.amount),
            queryResult.bptIn.amount,
        ];
    } else {
        /*
         * If the pool type tokens list contains BPT (for example: Composable Stable), the queryResult.amountsOut 
         * includes the amount out of the bpt, which is always 0, so we need to remove it from the 
         * expectedDeltas and put the bptIn.amount in its place.
        */
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
