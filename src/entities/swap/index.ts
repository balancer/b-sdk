import { PathWithAmount } from '../path';
import { TokenAmount } from '../tokenAmount';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { abs, DEFAULT_USERDATA, MathSol } from '../../utils';
import { Address } from 'viem';
import { PriceImpactAmount } from '../priceImpactAmount';
import cloneDeep from 'lodash/cloneDeep';
import { convertNativeAddressToZero } from '../utils/convertNativeAddressToZero';

export interface SwapBase {
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount>;
    queryCallData(): string;
}

// A Swap can be a single or multiple paths
export class Swap implements SwapBase {
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
    public swaps: BatchSwapStep[] | SingleSwap;

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

    // biome-ignore lint/correctness/noUnusedVariables: <placeholder method that needs to be overriden>
    async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        throw new Error('Use swapV2 or swapV3 instead.');
    }

    queryCallData(): string {
        throw new Error('Use swapV2 or swapV3 instead.');
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

    private getSwaps(paths: PathWithAmount[]) {
        let swaps: BatchSwapStep[] | SingleSwap;
        if (this.isBatchSwap) {
            swaps = [] as BatchSwapStep[];
            if (this.swapKind === SwapKind.GivenIn) {
                paths.map((p) => {
                    p.pools.map((pool, i) => {
                        (swaps as BatchSwapStep[]).push({
                            poolId: pool.id,
                            assetInIndex: BigInt(
                                this.assets.indexOf(p.tokens[i].address),
                            ),
                            assetOutIndex: BigInt(
                                this.assets.indexOf(p.tokens[i + 1].address),
                            ),
                            amount: i === 0 ? p.inputAmount.amount : 0n,
                            userData: DEFAULT_USERDATA,
                        });
                    });
                });
            } else {
                paths.map((p) => {
                    // Vault expects given out swaps to be in reverse order
                    const reversedPools = [...p.pools].reverse();
                    const reversedTokens = [...p.tokens].reverse();
                    reversedPools.map((pool, i) => {
                        (swaps as BatchSwapStep[]).push({
                            poolId: pool.id,
                            assetInIndex: BigInt(
                                this.assets.indexOf(
                                    reversedTokens[i + 1].address,
                                ),
                            ),
                            assetOutIndex: BigInt(
                                this.assets.indexOf(reversedTokens[i].address),
                            ),
                            amount: i === 0 ? p.outputAmount.amount : 0n,
                            userData: DEFAULT_USERDATA,
                        });
                    });
                });
            }
        } else {
            const path = this.paths[0];
            const pool = path.pools[0];
            const assetIn = convertNativeAddressToZero(path.tokens[0].address);
            const assetOut = convertNativeAddressToZero(path.tokens[1].address);
            swaps = {
                poolId: pool.id,
                kind: this.swapKind,
                assetIn,
                assetOut,
                amount: path.swapAmount.amount,
                userData: DEFAULT_USERDATA,
            } as SingleSwap;
        }
        return swaps;
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
