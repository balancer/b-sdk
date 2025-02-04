import { abs, ChainId, isSameAddress, max, min } from '../../utils';
import { InputToken, SwapKind } from '../../types';
import { PriceImpactAmount } from '../priceImpactAmount';
import { RemoveLiquidityKind } from '../removeLiquidity/types';
import { Swap, SwapInput, TokenApi } from '../swap';
import { TokenAmount } from '../tokenAmount';
import { PoolStateWithUnderlyings, PoolTokenWithUnderlying } from '../types';
import { priceImpactABA } from './helper';
import { AddLiquidityBoostedUnbalancedInput } from '../addLiquidityBoosted/types';
import { AddLiquidityBoostedV3 } from '../addLiquidityBoosted';
import { RemoveLiquidityBoostedV3 } from '../removeLiquidityBoosted';
import { RemoveLiquidityBoostedProportionalInput } from '../removeLiquidityBoosted/types';
import { Address, BaseError, ContractFunctionRevertedError } from 'viem';
import { Token } from '../token';

/**
 * Calculate price impact on add liquidity unbalanced operations
 *
 * This is the only price impact calculation that adapts the ABA method instead
 * of applying it directly. This happens because tha ABA method requires a
 * corresponding reverse operation to be applied, so we "get back" to the original
 * state for comparison, hence A -> B -> A.
 * This is not possible for AddLiquidityUnbalanced on v3 because there is no
 * RemoveLiquidityUnbalanced.
 * The alternative found was to simulate the RemoveLiquidityUnbalanced by applying
 * RemoveLiquidityProportional and then swapping between tokens.
 *
 * Here are the steps to calculate the price impact for add liquidity unbalanced:
 * 1. query add liquidity unbalanced with `exactAmountsIn` to get `bptOut`
 * 2. query remove liquidity proportional with `bptOut` as `bptIn` to get `proportionalAmountsOut`
 * 3. get `diffs` =  `proportionalAmountsOut` - `exactAmountsIn`
 * 4. swap between tokens zeroing out the `diffs` between `proportionalAmountsOut`
 *    and `exactAmountsIn`, leaving the remaining diff within a single
 *    token → `diffFinal` (see code below for detailed steps)
 * 5. `amountInitial` will be the the `exactAmountsIn` respective to `diffFinal` token
 * 6. price impact ABA = `diffFinal` / `amountInitial` / 2
 *
 * @param input same input used in the corresponding add liquidity operation
 * @param poolState same pool state used in the corresponding add liquidity operation
 * @returns price impact amount
 */
export async function addLiquidityUnbalancedBoosted(
    input: AddLiquidityBoostedUnbalancedInput,
    poolState: PoolStateWithUnderlyings,
): Promise<PriceImpactAmount> {
    // inputs are being validated within AddLiquidity

    // simulate adding liquidity to get amounts in
    const addLiquidity = new AddLiquidityBoostedV3();
    let amountsIn: TokenAmount[];
    let bptOut: TokenAmount;
    try {
        const queryResult = await addLiquidity.query(input, poolState);
        amountsIn = queryResult.amountsIn;
        bptOut = queryResult.bptOut;
    } catch (err) {
        throw new Error(
            `addLiquidity operation will fail at SC level with user defined input.\n${err}`,
        );
    }
    const poolTokens = amountsIn.map((a) => a.token);

    // simulate removing liquidity to get amounts out
    const removeLiquidity = new RemoveLiquidityBoostedV3();
    const removeLiquidityInput: RemoveLiquidityBoostedProportionalInput = {
        chainId: input.chainId,
        rpcUrl: input.rpcUrl,
        bptIn: bptOut.toInputAmount(),
        tokensOut: poolTokens.map((t) => t.address),
        kind: RemoveLiquidityKind.Proportional,
    };
    const { amountsOut } = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    // deltas between unbalanced and proportional amounts
    const deltas = amountsOut.map((a, i) => a.amount - amountsIn[i].amount);

    // get how much BPT each delta would mint
    const deltaBPTs: bigint[] = [];
    for (let i = 0; i < deltas.length; i++) {
        if (deltas[i] === 0n) {
            deltaBPTs.push(0n);
        } else {
            deltaBPTs.push(
                await queryAddLiquidityForTokenDelta(
                    addLiquidity,
                    input,
                    poolState,
                    poolTokens,
                    i,
                    deltas[i],
                ),
            );
        }
    }

    // zero out deltas by swapping between tokens from proportionalAmounts
    // to exactAmountsIn, leaving the remaining delta within a single token
    let remainingDeltaIndex = 0;
    if (deltaBPTs.some((deltaBPT) => deltaBPT !== 0n)) {
        remainingDeltaIndex = await zeroOutDeltas(
            addLiquidity,
            input,
            poolState,
            poolTokens,
            deltas,
            deltaBPTs,
        );
    }

    // get relevant amount for price impact calculation
    const deltaAmount = TokenAmount.fromRawAmount(
        amountsIn[remainingDeltaIndex].token,
        abs(deltas[remainingDeltaIndex]),
    );

    // calculate price impact using ABA method
    return priceImpactABA(
        amountsIn[remainingDeltaIndex],
        amountsIn[remainingDeltaIndex].sub(deltaAmount),
    );
}

async function queryAddLiquidityForTokenDelta(
    addLiquidity: AddLiquidityBoostedV3,
    input: AddLiquidityBoostedUnbalancedInput,
    poolState: PoolStateWithUnderlyings,
    poolTokens: Token[],
    tokenIndex: number,
    delta: bigint,
): Promise<bigint> {
    const absDelta = TokenAmount.fromRawAmount(
        poolTokens[tokenIndex],
        abs(delta),
    );

    const amountsIn = [absDelta.toInputAmount()];
    if (absDelta.amount <= 1000n)
        // Work-around Vault _MINIMUM_WRAP_AMOUNT limit
        amountsIn[0].rawAmount = 1001n;
    try {
        const { bptOut: deltaBPT } = await addLiquidity.query(
            {
                ...input,
                amountsIn,
            },
            poolState,
        );
        return delta < 0n ? -deltaBPT.amount : deltaBPT.amount;
    } catch (err) {
        // see https://viem.sh/docs/contract/simulateContract#handling-custom-errors
        if (err instanceof BaseError) {
            const revertError = err.walk(
                (err) => err instanceof ContractFunctionRevertedError,
            );
            if (revertError instanceof ContractFunctionRevertedError) {
                const errorName = revertError.data?.errorName ?? '';
                if (errorName === 'WrapAmountTooSmall') {
                    return 0n;
                }
            }
        }
        throw new Error(
            `Unexpected error while calculating addLiquidityUnbalancedBoosted PI at Delta add step:\n${err}`,
        );
    }
}

async function zeroOutDeltas(
    addLiquidity: AddLiquidityBoostedV3,
    input: AddLiquidityBoostedUnbalancedInput,
    poolState: PoolStateWithUnderlyings,
    poolTokens: Token[],
    deltas: bigint[],
    deltaBPTs: bigint[],
) {
    let minNegativeDeltaIndex = deltaBPTs.findIndex(
        (deltaBPT) => deltaBPT === max(deltaBPTs.filter((a) => a < 0n)),
    );
    const nonZeroDeltasBPTs = deltaBPTs.filter((d) => d !== 0n);
    for (let i = 0; i < nonZeroDeltasBPTs.length - 1; i++) {
        const minPositiveDeltaIndex = deltaBPTs.findIndex(
            (deltaBPT) => deltaBPT === min(deltaBPTs.filter((a) => a > 0n)),
        );
        minNegativeDeltaIndex = deltaBPTs.findIndex(
            (deltaBPT) => deltaBPT === max(deltaBPTs.filter((a) => a < 0n)),
        );

        let swapKind: SwapKind;
        let givenTokenIndex: number;
        let resultTokenIndex: number;
        let inputAmountRaw = 0n;
        let outputAmountRaw = 0n;
        if (
            deltaBPTs[minPositiveDeltaIndex] <
            abs(deltaBPTs[minNegativeDeltaIndex])
        ) {
            swapKind = SwapKind.GivenIn;
            givenTokenIndex = minPositiveDeltaIndex;
            resultTokenIndex = minNegativeDeltaIndex;
            inputAmountRaw = abs(deltas[givenTokenIndex]);
        } else {
            swapKind = SwapKind.GivenOut;
            givenTokenIndex = minNegativeDeltaIndex;
            resultTokenIndex = minPositiveDeltaIndex;
            outputAmountRaw = abs(deltas[givenTokenIndex]);
        }

        // address & decimals
        const tokenIn = poolTokens[minPositiveDeltaIndex].toInputToken();
        const tokenInWrapInfo = getTokenWrapInfo(poolState.tokens, tokenIn);

        const tokenOut = poolTokens[minNegativeDeltaIndex].toInputToken();
        const tokenOutWrapInfo = getTokenWrapInfo(poolState.tokens, tokenOut);

        // Construct a buffer swap
        const swapInput = buildSwapInput(
            input.chainId,
            swapKind,
            poolState.address,
            tokenInWrapInfo,
            tokenOutWrapInfo,
            inputAmountRaw,
            outputAmountRaw,
        );
        try {
            const swap = new Swap(swapInput);
            const result = await swap.query(input.rpcUrl);
            const resultAmount =
                result.swapKind === SwapKind.GivenIn
                    ? result.expectedAmountOut
                    : result.expectedAmountIn;

            deltas[givenTokenIndex] = 0n;
            deltaBPTs[givenTokenIndex] = 0n;
            deltas[resultTokenIndex] =
                deltas[resultTokenIndex] + resultAmount.amount;
            deltaBPTs[resultTokenIndex] = await queryAddLiquidityForTokenDelta(
                addLiquidity,
                input,
                poolState,
                poolTokens,
                resultTokenIndex,
                deltas[resultTokenIndex],
            );
        } catch (err) {
            throw new Error(
                `Unexpected error while calculating addLiquidityUnbalancedBoosted PI at Swap step:\n${err}`,
            );
        }
    }
    return minNegativeDeltaIndex;
}

type TokenWrapInfo = {
    token: InputToken;
    shouldWrap: boolean;
    wrapped: InputToken | undefined;
};

function getTokenWrapInfo(
    tokens: PoolTokenWithUnderlying[],
    token: InputToken,
): TokenWrapInfo {
    const poolToken = tokens.find((t) =>
        isSameAddress(t.address, token.address),
    );
    if (poolToken)
        return {
            token: poolToken,
            shouldWrap: false,
            wrapped: undefined,
        };

    const wrapped = tokens
        .filter((t) => t.underlyingToken !== null)
        .find((t) => isSameAddress(t.underlyingToken!.address, token.address));

    if (!wrapped) throw Error(`Cannot map token to wrapped: ${token.address}`);
    return {
        token: token,
        shouldWrap: true,
        wrapped,
    };
}

function buildSwapInput(
    chainId: ChainId,
    swapKind: SwapKind,
    pool: Address,
    tokenInWrapInfo: TokenWrapInfo,
    tokenOutWrapInfo: TokenWrapInfo,
    inputAmountRaw: bigint,
    outputAmountRaw: bigint,
): SwapInput {
    const inTokens: TokenApi[] = [
        {
            address: tokenInWrapInfo.token.address,
            decimals: tokenInWrapInfo.token.decimals,
        },
    ];

    const outTokens = [
        {
            address: tokenOutWrapInfo.token.address,
            decimals: tokenOutWrapInfo.token.decimals,
        },
    ];

    const pools = [pool];
    const isBuffer = [false];

    if (tokenInWrapInfo.shouldWrap) {
        inTokens.push({
            address: tokenInWrapInfo.wrapped!.address,
            decimals: tokenInWrapInfo.wrapped!.decimals,
        });
        pools.unshift(tokenInWrapInfo.wrapped!.address);
        isBuffer.unshift(true);
    }

    if (tokenOutWrapInfo.shouldWrap) {
        outTokens.unshift({
            address: tokenOutWrapInfo.wrapped!.address,
            decimals: tokenOutWrapInfo.wrapped!.decimals,
        });
        pools.push(tokenOutWrapInfo.wrapped!.address);
        isBuffer.push(true);
    }

    // Construct a buffer swap
    const swapInput: SwapInput = {
        chainId,
        paths: [
            {
                tokens: [...inTokens, ...outTokens],
                pools,
                isBuffer,
                inputAmountRaw,
                outputAmountRaw,
                protocolVersion: 3,
            },
        ],
        swapKind,
    };
    return swapInput;
}
