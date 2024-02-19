import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    SwapBase,
    SwapCallExactIn,
    SwapCallExactOut,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
} from './types';
import { SwapV2 } from './swapV2';
import { validatePaths } from './pathHelpers';
import { Slippage } from '../slippage';
import { SwapV3 } from './swapV3';

export * from './types';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;
    public balancerVersion: 2 | 3;

    public constructor(swapInput: SwapInput) {
        validatePaths(swapInput.paths);

        if (swapInput.paths[0].balancerVersion === 2) {
            this.balancerVersion = 2;
            this.swap = new SwapV2(swapInput);
        } else {
            this.balancerVersion = 3;
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
    public async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
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
     * @param swapCall
     * @returns
     */
    buildCall(
        swapCall: SwapCallExactIn | SwapCallExactOut,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        let limitAmount: TokenAmount;
        if ('expectedAmountOut' in swapCall) {
            limitAmount = this.limitAmount(
                swapCall.slippage,
                SwapKind.GivenIn,
                swapCall.expectedAmountOut,
            );
            return {
                ...this.swap.buildCall({ ...swapCall, limitAmount }),
                minAmountOut: limitAmount,
            };
        }
        limitAmount = this.limitAmount(
            swapCall.slippage,
            SwapKind.GivenOut,
            swapCall.expectedAmountIn,
        );
        return {
            ...this.swap.buildCall({ ...swapCall, limitAmount }),
            maxAmountIn: limitAmount,
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
}
