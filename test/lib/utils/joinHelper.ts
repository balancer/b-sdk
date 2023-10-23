import { replaceWrapped, Token } from '../../../src';
import { sendTransactionGetBalances } from './helper';
import { expect } from 'vitest';
import { JoinTxInput } from './types';

/**
 * Helper function that sends a join transaction and check for balance deltas
 * @param txInput
 *      @param poolJoin: PoolJoin - The pool join class, used to query the join and build the join call
 *      @param poolInput: PoolStateInput - The state of the pool being joined
 *      @param joinInput: JoinInput - The parameters of the join transaction, example: bptOut, amountsIn, etc.
 *      @param testAddress: Address - The address to send the transaction from
 *      @param client: Client & PublicActions & WalletActions - The RPC client
 *      @param slippage: Slippage - The slippage tolerance for the join transaction
 *      @param checkNativeBalance: boolean - Whether to check the native asset balance or not
 *      @param chainId: ChainId - The Chain Id of the pool being joined, for example: 1 for Mainnet, 137 for Polygon, etc.
 */

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
        /*
        * If the pool type tokens list contains BPT (for example: Composable Stable), the poolTokensAddr 
        * will already have the bpt address, so we don't need to add it again.
        * */
        tokensForBalanceCheck = [...poolTokensAddr];
    } else {
        /**
         * If the pool type tokens list does not contains BPT (for example: Weighted), the poolTokensAddr
         * will not have the bpt address, so we need to add it, so the balance delta of the bpt will be 
         * checked in the tests.
         */
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
        /*
         * If the pool type tokens list contains BPT (for example: Composable Stable), the queryResult.amountsIn 
         * includes the amount in of the bptIn, which is always 0, so we need to remove it from the 
         * expectedDeltas and put the bptOut.amount in its place.
        */
        expectedDeltas = [
            ...queryResult.amountsIn.slice(0, bptIndex).map((a) => a.amount),
            queryResult.bptOut.amount,
            ...queryResult.amountsIn.slice(bptIndex + 1).map((a) => a.amount),
        ];
    } else {
        /**
         * If the pool type tokens list does not contains BPT (for example: Weighted), the queryResult.amountsIn
         * does not include the amount of the bptIn, so we just need to add the bptOut.amount in the end
         * of the expectedDeltas.
         */
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
