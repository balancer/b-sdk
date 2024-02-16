import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    Path,
    SwapBase,
    SwapCallExactIn,
    SwapCallExactOut,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
} from './types';
import { SwapV2 } from './swapV2';
import { validatePaths } from './pathHelpers';
import { Slippage } from '../slippage';
import { SingleSwapInput } from '../utils/doSingleSwapQuery';
import { PriceImpact } from '../priceImpact';

export * from './types';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;

    public constructor({
        chainId,
        paths,
        swapKind,
    }: { chainId: number; paths: Path[]; swapKind: SwapKind }) {
        validatePaths(paths);

        switch (paths[0].balancerVersion) {
            case 2:
                this.swap = new SwapV2({ chainId, paths, swapKind });
                return;
            case 3:
                throw new Error('Unsupported Balancer Protocol Version');
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

    public get isBatchSwap(): boolean {
        return this.swap.isBatchSwap;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        return this.swap.query(rpcUrl, block);
    }

    public queryCallData(): string {
        return this.swap.queryCallData();
    }

    public async priceImpact(rpcUrl: string): Promise<PriceImpactAmount> {
        if (!this.swap.isBatchSwap) {
            const input: SingleSwapInput = {
                chainId: this.swap.chainId,
                rpcUrl,
                poolId: this.swap.paths[0].pools[0],
                kind: this.swap.swapKind,
                assetIn: this.swap.inputAmount.token.address,
                assetOut: this.swap.outputAmount.token.address,
                amount: this.swap.inputAmount.amount,
                userData: '0x',
            };
            return await PriceImpact.singleSwap(input);
        }
        throw new Error('Price Impact BatchSwap still to be implemented');
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
