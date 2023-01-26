import { Path, PathWithAmount } from './path';
import { TokenAmount } from './';
import { SingleSwap, SwapKind, BatchSwapStep } from '../types';
import { DEFAULT_USERDATA, DEFAULT_FUND_MANAGMENT } from '../utils';
import { BaseProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import vaultAbi from '../abi/Vault.json';

// A Swap can be a single or multiple paths
export class Swap {
    public static async fromPaths(fromPaths: PathWithAmount[], swapKind: SwapKind): Promise<Swap> {
        const paths: {
            path: Path;
            inputAmount: TokenAmount;
            outputAmount: TokenAmount;
        }[] = [];

        for (const path of fromPaths) {
            const amounts: TokenAmount[] = new Array(path.tokens.length);
            amounts[0] = path.swapAmount;
            for (let i = 0; i < path.pools.length; i++) {
                const pool = path.pools[i];
                const outputAmount = await pool.swapGivenIn(
                    path.tokens[i],
                    path.tokens[i + 1],
                    amounts[i],
                );
                amounts[i + 1] = outputAmount;
            }
            const inputAmount = amounts[0];
            const outputAmount = amounts[amounts.length - 1];
            paths.push({ path, inputAmount, outputAmount });
        }

        return new Swap({ paths, swapKind });
    }

    protected constructor({
        paths,
        swapKind,
    }: {
        paths: {
            path: Path;
            inputAmount: TokenAmount;
            outputAmount: TokenAmount;
        }[];
        swapKind: SwapKind;
    }) {
        this.paths = paths;
        this.swapKind = swapKind;
        this.isBatchSwap = paths.length > 1 || paths[0].path.pools.length > 2 ? true : false;
        this.assets = [
            ...new Set(
                paths
                    .map(p => p.path.tokens)
                    .flat()
                    .map(t => t.address),
            ),
        ];
        const swaps = [] as BatchSwapStep[];
        paths.map(p => {
            p.path.pools.map((pool, i) => {
                swaps.push({
                    poolId: pool.id,
                    assetInIndex: this.assets.indexOf(p.path.tokens[i].address),
                    assetOutIndex: this.assets.indexOf(p.path.tokens[i + 1].address),
                    amount: i === 0 ? p.inputAmount.amount.toString() : '0',
                    userData: DEFAULT_USERDATA,
                });
            });
        });
        this.swaps = swaps;
    }

    public readonly isBatchSwap: boolean;
    public readonly paths: {
        path: Path;
        inputAmount: TokenAmount;
        outputAmount: TokenAmount;
    }[];
    public readonly assets: string[];
    public readonly swapKind: SwapKind;
    public swaps: BatchSwapStep[];

    public get inputAmount(): TokenAmount {
        if (!this.paths.every(p => p.inputAmount.token === this.paths[0].inputAmount.token)) {
            throw new Error(
                'Input amount can only be calculated if all paths have the same input token',
            );
        }
        const amounts = this.paths.map(path => path.inputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }

    public get outputAmount(): TokenAmount {
        // TODO: This check is not working
        // if (!this.paths.every(p => p.outputAmount.token === this.paths[0].outputAmount.token)) {
        //   throw new Error('Output amount can only be calculated if all paths have the same output token');
        // }
        const amounts = this.paths.map(path => path.outputAmount);
        return amounts.reduce((a, b) => a.add(b));
    }

    // TODO: Decide if query should stay on the swap class
    // TODO: Decide if provider should be passed to the constructor
    public async query(provider: BaseProvider, block?: number): Promise<TokenAmount> {
        const vault = new Contract(
            `0xBA12222222228d8Ba445958a75a0704d566BF2C8`,
            vaultAbi,
            provider,
        );

        const deltas = await vault.callStatic.queryBatchSwap(
            SwapKind.GivenIn,
            this.swaps,
            this.assets,
            DEFAULT_FUND_MANAGMENT,
            {
                blockTag: block,
            },
        );

        const outputAmount = TokenAmount.fromRawAmount(
            this.paths[0].outputAmount.token,
            deltas[this.assets.indexOf(this.paths[0].outputAmount.token.address)].abs(),
        );
        return outputAmount;
    }

    public async callData(): Promise<string> {
        const iface = new Interface(vaultAbi);
        const callData = await iface.encodeFunctionData('queryBatchSwap', [
            SwapKind.GivenIn,
            this.swaps,
            this.assets,
            DEFAULT_FUND_MANAGMENT,
        ]);
        return callData;
    }

    // public get executionPrice(): Price {}
    // public get priceImpact(): Percent {}
}
