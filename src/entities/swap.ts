import { PathWithAmount } from './path';
import { TokenAmount } from './tokenAmount';
import { SwapKind, BatchSwapStep } from '../types';
import { DEFAULT_USERDATA, DEFAULT_FUND_MANAGMENT, ZERO_ADDRESS, NATIVE_ASSETS } from '../utils';
import { BaseProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import vaultAbi from '../abi/Vault.json';

// A Swap can be a single or multiple paths
export class Swap {
    public constructor({ paths, swapKind }: { paths: PathWithAmount[]; swapKind: SwapKind }) {
        if (paths.length === 0) throw new Error('Invalid swap: must contain at least 1 path.');
        // Recalculate paths while mutating pool balances
        this.paths = paths.map(
            path => new PathWithAmount(path.tokens, path.pools, path.swapAmount, true),
        );
        this.swapKind = swapKind;
        this.isBatchSwap = paths.length > 1 || paths[0].pools.length > 2 ? true : false;
        this.assets = [
            ...new Set(
                paths
                    .map(p => p.tokens)
                    .flat()
                    .map(t => t.address),
            ),
        ];

        const swaps = [] as BatchSwapStep[];
        if (this.swapKind === SwapKind.GivenIn) {
            this.paths.map(p => {
                p.pools.map((pool, i) => {
                    swaps.push({
                        poolId: pool.id,
                        assetInIndex: this.assets.indexOf(p.tokens[i].address),
                        assetOutIndex: this.assets.indexOf(p.tokens[i + 1].address),
                        amount: i === 0 ? p.inputAmount.amount.toString() : '0',
                        userData: DEFAULT_USERDATA,
                    });
                });
            });
        } else {
            this.paths.map(p => {
                // Vault expects given out swaps to be in reverse order
                const reversedPools = [...p.pools].reverse();
                const reversedTokens = [...p.tokens].reverse();
                reversedPools.map((pool, i) => {
                    swaps.push({
                        poolId: pool.id,
                        assetInIndex: this.assets.indexOf(reversedTokens[i + 1].address),
                        assetOutIndex: this.assets.indexOf(reversedTokens[i].address),
                        amount: i === 0 ? p.outputAmount.amount.toString() : '0',
                        userData: DEFAULT_USERDATA,
                    });
                });
            });
        }

        this.assets = this.assets.map(a => {
            return a === NATIVE_ASSETS[paths[0].inputAmount.token.chainId].address
                ? ZERO_ADDRESS
                : a;
        });

        this.swaps = swaps;
    }

    public readonly isBatchSwap: boolean;
    public readonly paths: PathWithAmount[];
    public readonly assets: string[];
    public readonly swapKind: SwapKind;
    public swaps: BatchSwapStep[];

    public get inputAmount(): TokenAmount {
        if (!this.paths.every(p => p.inputAmount.token.isEqual(this.paths[0].inputAmount.token))) {
            throw new Error(
                'Input amount can only be calculated if all paths have the same input token',
            );
        }
        const amounts = this.paths.map(path => path.inputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }

    public get outputAmount(): TokenAmount {
        if (
            !this.paths.every(p => p.outputAmount.token.isEqual(this.paths[0].outputAmount.token))
        ) {
            throw new Error(
                'Output amount can only be calculated if all paths have the same output token',
            );
        }
        const amounts = this.paths.map(path => path.outputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }

    public async query(provider: BaseProvider, block?: number): Promise<TokenAmount> {
        const vault = new Contract(
            `0xBA12222222228d8Ba445958a75a0704d566BF2C8`,
            vaultAbi,
            provider,
        );

        const deltas = await vault.callStatic.queryBatchSwap(
            this.swapKind,
            this.swaps,
            this.assets,
            DEFAULT_FUND_MANAGMENT,
            {
                blockTag: block,
            },
        );

        const amount =
            this.swapKind === SwapKind.GivenIn
                ? TokenAmount.fromRawAmount(
                      this.paths[0].outputAmount.token,
                      deltas[
                          this.assets.indexOf(
                              this.convertAssetAddress(this.paths[0].outputAmount.token.address),
                          )
                      ].abs(),
                  )
                : TokenAmount.fromRawAmount(
                      this.paths[0].inputAmount.token,
                      deltas[
                          this.assets.indexOf(
                              this.convertAssetAddress(this.paths[0].inputAmount.token.address),
                          )
                      ].abs(),
                  );
        return amount;
    }

    private convertAssetAddress(address: string): string {
        return address === NATIVE_ASSETS[this.paths[0].inputAmount.token.chainId].address
            ? ZERO_ADDRESS
            : address;
    }

    public callData(): string {
        const iface = new Interface(vaultAbi);
        const callData = iface.encodeFunctionData('queryBatchSwap', [
            this.swapKind,
            this.swaps,
            this.assets,
            DEFAULT_FUND_MANAGMENT,
        ]);
        return callData;
    }

    // public get executionPrice(): Price {}
    // public get priceImpact(): Percent {}
}
