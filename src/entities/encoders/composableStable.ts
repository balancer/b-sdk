import { encodeAbiParameters } from 'viem';
import { Address } from '../../types';

export enum ComposableStablePoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2,
    ALL_TOKENS_IN_FOR_EXACT_BPT_OUT = 3,
}

export enum ComposableStablePoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 1,
    EXACT_BPT_IN_FOR_ALL_TOKENS_OUT = 2,
}

export class ComposableStableEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }

    /**
     * Encodes the userData parameter for providing the initial liquidity to a ComposableStablePool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static addLiquidityInit = (amountsIn: bigint[]): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }],
            [BigInt(ComposableStablePoolJoinKind.INIT), amountsIn],
        );

    /**
     * Encodes the userData parameter for adding liquidity to a ComposableStablePool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static addLiquidityUnbalanced = (
        amountsIn: bigint[],
        minimumBPT: bigint,
    ): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(
                    ComposableStablePoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
                ),
                amountsIn,
                minimumBPT,
            ],
        );

    /**
     * Encodes the userData parameter for adding liquidity to a ComposableStablePool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param tokenIndex - the index of the token to be provided as liquidity
     */
    static addLiquiditySingleToken = (
        bptAmountOut: bigint,
        tokenIndex: number,
    ): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(ComposableStablePoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT),
                bptAmountOut,
                BigInt(tokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for adding liquidity to a ComposableStablePool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    static addLiquidityProportional = (bptAmountOut: bigint): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(
                    ComposableStablePoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT,
                ),
                bptAmountOut,
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a ComposableStablePool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param tokenIndex - the index of the token to be removed from the pool
     */
    static removeLiquiditySingleToken = (
        bptAmountIn: bigint,
        tokenIndex: number,
    ): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(
                    ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
                ),
                bptAmountIn,
                BigInt(tokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a ComposableStablePool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static removeLiquidityProportional = (bptAmountIn: bigint): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(
                    ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ALL_TOKENS_OUT,
                ),
                bptAmountIn,
            ],
        );
    };

    /**
     * Encodes the userData parameter for removing liquidity from a ComposableStablePool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static removeLiquidityUnbalanced = (
        amountsOut: bigint[],
        maxBPTAmountIn: bigint,
    ): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(
                    ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT,
                ),
                amountsOut,
                maxBPTAmountIn,
            ],
        );
}
