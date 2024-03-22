import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
    ExactOutQueryOutput,
    ExactInQueryOutput,
    QueryOutputBase,
} from './types';
import { SwapV2 } from './swaps/v2';
import { validatePaths } from './paths/pathHelpers';
import { Slippage } from '../slippage';
import { SwapV3 } from './swaps/v3';
import { MAX_UINT256 } from '@/utils';
import { SwapBase } from './swaps/types';

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
     * @param input
     * @returns
     */
    buildCall(
        input: SwapBuildCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        const isV2Input = 'sender' in input;
        if (this.vaultVersion === 3 && isV2Input)
            throw Error('Cannot define sender/recipient in V3');

        if (this.vaultVersion === 2 && !isV2Input)
            throw Error('Sender/recipient must be defined in V2');

        if (input.queryOutput.swapKind === SwapKind.GivenIn) {
            const minAmountOut = this.limitAmount(
                input.slippage,
                SwapKind.GivenIn,
                input.queryOutput.expectedAmountOut,
            );
            return {
                ...this.swap.buildCall({
                    ...input,
                    deadline: input.deadline ?? MAX_UINT256,
                    wethIsEth: !!input.wethIsEth,
                    limitAmount: minAmountOut,
                    pathLimits: this.pathLimits(
                        input.slippage,
                        input.queryOutput,
                        minAmountOut.amount,
                    ),
                }),
                minAmountOut,
            };
        }
        const maxAmountIn = this.limitAmount(
            input.slippage,
            SwapKind.GivenOut,
            input.queryOutput.expectedAmountIn,
        );
        const pathLimits = this.pathLimits(
            input.slippage,
            input.queryOutput,
            maxAmountIn.amount,
        );
        return {
            ...this.swap.buildCall({
                ...input,
                deadline: input.deadline ?? MAX_UINT256,
                wethIsEth: !!input.wethIsEth,
                limitAmount: maxAmountIn,
                pathLimits,
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
        maxAmount: bigint,
    ): bigint[] | undefined {
        if (!expected.pathAmounts) return undefined;
        let pathAmounts: bigint[];
        let total = 0n;
        if (expected.swapKind === SwapKind.GivenIn) {
            pathAmounts = expected.pathAmounts.map((a) => {
                const limit = slippage.applyTo(a, -1);
                total = total + limit;
                return limit;
            });
        } else {
            pathAmounts = expected.pathAmounts.map((a) => {
                const limit = slippage.applyTo(a);
                total = total + limit;
                return limit;
            });
        }
        // Slippage can lead to rounding diff compared to total so this handles dust diff
        const diff = maxAmount - total;
        pathAmounts[0] = pathAmounts[0] + diff;
        return pathAmounts;
    }
}
