import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    SwapBase,
    SwapCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
    ExactOutQueryOutput,
    ExactInQueryOutput,
    QueryOutputBase,
} from './types';
import { SwapV2 } from './swapV2';
import { validatePaths } from './pathHelpers';
import { Slippage } from '../slippage';
import { SwapV3 } from './swapV3';

export * from './types';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;
    public vaultVersion: 2 | 3;

    public constructor(swapInput: SwapInput) {
        validatePaths(swapInput.paths);

        if (swapInput.paths[0].vaultVersion === 2) {
            this.vaultVersion = 2;
            this.swap = new SwapV2(swapInput);
        } else {
            this.vaultVersion = 3;
            this.swap = new SwapV3(swapInput);
        }
    }

    public get quote(): TokenAmount {
        return this.swap.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    public get inputAmount(): TokenAmount {
        return this.swap.inputAmount;
    }

    public get outputAmount(): TokenAmount {
        return this.swap.outputAmount;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(
        rpcUrl?: string,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        return this.swap.query(rpcUrl, block);
    }

    public queryCallData(): string {
        return this.swap.queryCallData();
    }

    public get priceImpact(): PriceImpactAmount {
        throw new Error('Price Impact still to be implemented');
    }

    /**
     * Returns the transaction data to be sent to the vault contract
     *
     * @param callInput
     * @returns
     */
    buildCall(
        callInput: SwapCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        if (callInput.queryOutput.swapKind === SwapKind.GivenIn) {
            const minAmountOut = this.limitAmount(
                callInput.slippage,
                SwapKind.GivenIn,
                callInput.queryOutput.expectedAmountOut,
            );
            return {
                ...this.swap.buildCall({
                    ...callInput,
                    limitAmount: minAmountOut,
                    pathLimits: this.pathLimits(
                        callInput.slippage,
                        callInput.queryOutput,
                    ),
                }),
                minAmountOut,
            };
        }
        const maxAmountIn = this.limitAmount(
            callInput.slippage,
            SwapKind.GivenOut,
            callInput.queryOutput.expectedAmountIn,
        );
        return {
            ...this.swap.buildCall({
                ...callInput,
                limitAmount: maxAmountIn,
                pathLimits: this.pathLimits(
                    callInput.slippage,
                    callInput.queryOutput,
                ),
            }),
            maxAmountIn,
        };
    }

    /**
     * Apply slippage to expectedAmount. GivenIn: Remove to give minOut. GivenOut: Add to give maxIn.
     * @param slippage
     * @param swapKind
     * @param expectedAmount
     * @returns
     */
    private limitAmount(
        slippage: Slippage,
        swapKind: SwapKind,
        expectedAmount: TokenAmount,
    ): TokenAmount {
        let limitAmount: bigint;
        if (swapKind === SwapKind.GivenIn) {
            limitAmount = slippage.applyTo(expectedAmount.amount, -1);
        } else {
            limitAmount = slippage.applyTo(expectedAmount.amount);
        }
        return TokenAmount.fromRawAmount(expectedAmount.token, limitAmount);
    }

    /**
     * Apply slippage to pathAmounts. GivenIn: Remove to give minOut. GivenOut: Add to give maxIn.
     * @param slippage
     * @param expected
     * @returns
     */
    private pathLimits(
        slippage: Slippage,
        expected: QueryOutputBase,
    ): bigint[] | undefined {
        if (!expected.pathAmounts) return undefined;
        let pathAmounts: bigint[];
        if (expected.swapKind === SwapKind.GivenIn) {
            pathAmounts = expected.pathAmounts.map((a) =>
                slippage.applyTo(a, -1),
            );
        } else {
            pathAmounts = expected.pathAmounts.map((a) => slippage.applyTo(a));
        }
        return pathAmounts;
    }
}
