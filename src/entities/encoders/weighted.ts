import { encodeAbiParameters } from 'viem';
import { Hex } from '../../types';
import { AddLiquidityKind } from '../addLiquidity/types';
import {
    AddLiquidityAmounts,
    InitPoolAmounts,
    RemoveLiquidityAmounts,
} from '../types';
import { RemoveLiquidityKind } from '../removeLiquidity/types';
import {
    addLiquiditySingleTokenShouldHaveTokenInIndexError,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
} from '@/utils/errors';
import { encodeRemoveLiquidityRecovery } from '.';

export enum WeightedPoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2,
    ALL_TOKENS_IN_FOR_EXACT_BPT_OUT = 3,
}

export enum WeightedPoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    EXACT_BPT_IN_FOR_TOKENS_OUT = 1,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 2,
    MANAGEMENT_FEE_TOKENS_OUT = 3,
}

export class WeightedEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }

    /**
     * Encodes the User Data for initializing a WeightedPool
     * @param amounts Amounts of tokens to be added to the pool
     * @returns
     */
    static encodeInitPoolUserData(amounts: InitPoolAmounts) {
        return WeightedEncoder.initPool(amounts.maxAmountsIn);
    }

    /**
     * Encodes the User Data for adding liquidity to a WeightedPool
     * @param kind Kind of the Add Liquidity operation: Init, Unbalanced, SingleToken, Proportional
     * @param amounts Amounts of tokens to be added to the pool
     * @returns
     */
    static encodeAddLiquidityUserData = (
        kind: AddLiquidityKind,
        amounts: AddLiquidityAmounts,
    ): Hex => {
        switch (kind) {
            case AddLiquidityKind.Unbalanced:
                return WeightedEncoder.addLiquidityUnbalanced(
                    amounts.maxAmountsIn,
                    amounts.minimumBpt,
                );
            case AddLiquidityKind.SingleToken: {
                // just a sanity check as this is already checked in InputValidator
                if (amounts.tokenInIndex === undefined) {
                    throw addLiquiditySingleTokenShouldHaveTokenInIndexError;
                }
                return WeightedEncoder.addLiquiditySingleToken(
                    amounts.minimumBpt,
                    amounts.tokenInIndex,
                );
            }
            case AddLiquidityKind.Proportional: {
                return WeightedEncoder.addLiquidityProportional(
                    amounts.minimumBpt,
                );
            }
        }
    };

    /**
     * Encodes the User Data for removing liquidity from a WeightedPool
     * @param kind Kind of the Remove Liquidity operation: Unbalanced, SingleToken, Proportional
     * @param amounts Amounts of tokens to be removed from the pool
     * @returns
     */
    static encodeRemoveLiquidityUserData = (
        kind: RemoveLiquidityKind,
        amounts: RemoveLiquidityAmounts,
    ): Hex => {
        switch (kind) {
            case RemoveLiquidityKind.Unbalanced:
            case RemoveLiquidityKind.SingleTokenExactOut:
                return WeightedEncoder.removeLiquidityUnbalanced(
                    amounts.minAmountsOut,
                    amounts.maxBptAmountIn,
                );
            case RemoveLiquidityKind.SingleTokenExactIn:
                if (amounts.tokenOutIndex === undefined)
                    throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;

                return WeightedEncoder.removeLiquiditySingleTokenExactIn(
                    amounts.maxBptAmountIn,
                    amounts.tokenOutIndex,
                );
            case RemoveLiquidityKind.Proportional:
                return WeightedEncoder.removeLiquidityProportional(
                    amounts.maxBptAmountIn,
                );
            case RemoveLiquidityKind.Recovery:
                return encodeRemoveLiquidityRecovery(amounts.maxBptAmountIn);
        }
    };

    /**
     * Encodes the userData parameter for providing the initial liquidity to a WeightedPool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static initPool = (amountsIn: bigint[]): Hex =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }],
            [BigInt(WeightedPoolJoinKind.INIT), amountsIn],
        );

    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static addLiquidityUnbalanced = (
        amountsIn: bigint[],
        minimumBPT: bigint,
    ): Hex =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT),
                amountsIn,
                minimumBPT,
            ],
        );

    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param tokenIndex - the index of the token to be provided as liquidity
     */
    static addLiquiditySingleToken = (
        bptAmountOut: bigint,
        tokenIndex: number,
    ): Hex => {
        // if tokenIndex is provided, it's assumed to be an allTokensIn
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT),
                bptAmountOut,
                BigInt(tokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    static addLiquidityProportional = (bptAmountOut: bigint): Hex => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT),
                bptAmountOut,
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param tokenIndex - the index of the token to removed from the pool
     */
    static removeLiquiditySingleTokenExactIn = (
        bptAmountIn: bigint,
        tokenIndex: number,
    ): Hex => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT),
                bptAmountIn,
                BigInt(tokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static removeLiquidityProportional = (bptAmountIn: bigint): Hex => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT),
                bptAmountIn,
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static removeLiquidityUnbalanced = (
        amountsOut: bigint[],
        maxBPTAmountIn: bigint,
    ): Hex =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT),
                amountsOut,
                maxBPTAmountIn,
            ],
        );
}
