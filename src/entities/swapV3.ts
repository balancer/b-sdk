import { PathWithAmount } from './path';
import { TokenAmount } from './tokenAmount';
import { SingleSwap, SwapKind, BatchSwapStep } from '../types';
import { abs, MathSol } from '../utils';
import { Address } from 'viem';
import { PriceImpactAmount } from './priceImpactAmount';
import cloneDeep from 'lodash/cloneDeep';
import { convertNativeAddressToZero } from './utils/convertNativeAddressToZero';

// TODO V3: This needs to be updated to handle V3 data structure and query interface which will likely be different

// A Swap can be a single or multiple paths
export class SwapV3 {
    public constructor({
        paths,
        swapKind,
    }: {
        paths: PathWithAmount[];
        swapKind: SwapKind;
    }) {
        if (paths.length === 0)
            throw new Error('Invalid swap: must contain at least 1 path.');

        // paths with immutable pool balances
        this.pathsImmutable = cloneDeep(paths);

        // Recalculate paths while mutating pool balances
        this.paths = paths.map(
            (path) =>
                new PathWithAmount(
                    path.tokens,
                    path.pools,
                    path.swapAmount,
                    true,
                ),
        );
        this.chainId = paths[0].tokens[0].chainId;
        this.swapKind = swapKind;
        this.isBatchSwap = paths.length > 1 || paths[0].pools.length > 1;
        this.assets = [
            ...new Set(paths.flatMap((p) => p.tokens).map((t) => t.address)),
        ];
        const swaps = this.getSwaps(this.paths);

        this.assets = this.assets.map((a) => {
            return convertNativeAddressToZero(a);
        });

        this.swaps = swaps;
    }

    public readonly chainId: number;
    public readonly isBatchSwap: boolean;
    public readonly paths: PathWithAmount[];
    public readonly pathsImmutable: PathWithAmount[];
    public readonly assets: Address[];
    public readonly swapKind: SwapKind;
    public swaps: BatchSwapStep[] | SingleSwap; // TODO V3: This needs to be updated to handle V3 data structure

    public get quote(): TokenAmount {
        return this.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    public get inputAmount(): TokenAmount {
        return this.getInputAmount(this.paths);
    }

    public get outputAmount(): TokenAmount {
        return this.getOutputAmount(this.paths);
    }

    async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        throw new Error(`Not implemented ${rpcUrl} ${block}`);
    }

    queryCallData(): string {
        throw new Error('Not implemented');
    }

    public get priceImpact(): PriceImpactAmount {
        const paths = this.pathsImmutable;

        const pathsReverse = paths.map(
            (path) =>
                new PathWithAmount(
                    [...path.tokens].reverse(),
                    [...path.pools].reverse(),
                    this.swapKind === SwapKind.GivenIn
                        ? path.outputAmount
                        : path.inputAmount,
                ),
        );

        const amountInitial =
            this.swapKind === SwapKind.GivenIn
                ? this.getInputAmount(paths).amount
                : this.getOutputAmount(paths).amount;

        const amountFinal =
            this.swapKind === SwapKind.GivenIn
                ? this.getOutputAmount(pathsReverse).amount
                : this.getInputAmount(pathsReverse).amount;

        const priceImpact = MathSol.divDownFixed(
            abs(amountInitial - amountFinal),
            amountInitial * 2n,
        );
        return PriceImpactAmount.fromRawAmount(priceImpact);
    }

    // public get executionPrice(): Price {}

    // helper methods

    private getSwaps(paths: PathWithAmount[]): SingleSwap | BatchSwapStep[] {
        throw new Error(`Not implemented ${paths}`);
    }

    private getInputAmount(paths: PathWithAmount[]): TokenAmount {
        if (
            !paths.every((p) =>
                p.inputAmount.token.isEqual(paths[0].inputAmount.token),
            )
        ) {
            throw new Error(
                'Input amount can only be calculated if all paths have the same input token',
            );
        }
        const amounts = paths.map((path) => path.inputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }

    private getOutputAmount(paths: PathWithAmount[]): TokenAmount {
        if (
            !paths.every((p) =>
                p.outputAmount.token.isEqual(paths[0].outputAmount.token),
            )
        ) {
            throw new Error(
                'Output amount can only be calculated if all paths have the same output token',
            );
        }
        const amounts = paths.map((path) => path.outputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }
}
