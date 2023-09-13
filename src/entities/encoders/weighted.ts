import { encodeAbiParameters } from 'viem';
import { Address } from '../../types';

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

// TODO: rename functions after deciding on the naming convention
export class WeightedEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }

    /**
     * Encodes the userData parameter for providing the initial liquidity to a WeightedPool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static joinInit = (amountsIn: bigint[]): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }],
            [BigInt(WeightedPoolJoinKind.INIT), amountsIn],
        );

    /**
     * Encodes the userData parameter for joining a WeightedPool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static joinUnbalanced = (
        amountsIn: bigint[],
        minimumBPT: bigint,
    ): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT),
                amountsIn,
                minimumBPT,
            ],
        );

    /**
     * Encodes the userData parameter for joining a WeightedPool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    static joinSingleAsset = (
        bptAmountOut: bigint,
        enterTokenIndex: number,
    ): Address => {
        // if enterTokenIndex is provided, it's assumed to be an allTokensIn
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT),
                bptAmountOut,
                BigInt(enterTokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for joining a WeightedPool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    static joinProportional = (bptAmountOut: bigint): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT),
                bptAmountOut,
            ],
        );
    };

    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    static exitSingleAsset = (
        bptAmountIn: bigint,
        exitTokenIndex: number,
    ): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT),
                bptAmountIn,
                BigInt(exitTokenIndex),
            ],
        );
    };

    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static exitProportional = (bptAmountIn: bigint): Address => {
        return encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT),
                bptAmountIn,
            ],
        );
    };

    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static exitUnbalanced = (
        amountsOut: bigint[],
        maxBPTAmountIn: bigint,
    ): Address =>
        encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256[]' }, { type: 'uint256' }],
            [
                BigInt(WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT),
                amountsOut,
                maxBPTAmountIn,
            ],
        );
}
