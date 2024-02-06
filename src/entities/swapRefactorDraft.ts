import { TokenAmount } from './tokenAmount';
import { SingleSwap, SwapKind, BatchSwapStep } from '../types';
import {
    abs,
    BALANCER_QUERIES,
    DEFAULT_USERDATA,
    DEFAULT_FUND_MANAGMENT,
    ZERO_ADDRESS,
    NATIVE_ADDRESS,
    MathSol,
} from '../utils';
import {
    Address,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { balancerQueriesAbi } from '../abi';
import { PriceImpactAmount } from './priceImpactAmount';
import cloneDeep from 'lodash.clonedeep';
import { Token } from './token';
import { MinimalToken } from '..';

/**
API Returns list of GqlSorPath:

type GqlSorPath {
   pools: [String]! --- note can this be address?
   tokens: [Token]!
   outputAmountRaw: String!
   inputAmountRaw: String!
}

type Token {
    address: String!
    decimals: Int!
}
*/

type TokenApi = Omit<MinimalToken, 'index'>;

type Path = {
    pools: Address[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
};

class PathWithAmount {
    public readonly pools: Address[];
    public readonly tokens: TokenApi[];
    public readonly outputAmount: TokenAmount;
    public readonly inputAmount: TokenAmount;

    public constructor(
        chainId: number,
        tokens: TokenApi[],
        pools: Address[],
        inputAmountRaw: bigint,
        outputAmountRaw: bigint,
    ) {
        if (pools.length === 0 || tokens.length < 2) {
            throw new Error(
                'Invalid path: must contain at least 1 pool and 2 tokens.',
            );
        }
        if (tokens.length !== pools.length + 1) {
            throw new Error(
                'Invalid path: tokens length must equal pools length + 1',
            );
        }

        const tokenIn = new Token(
            chainId,
            tokens[0].address,
            tokens[0].decimals,
        );
        const tokenOut = new Token(
            chainId,
            tokens[tokens.length - 1].address,
            tokens[tokens.length - 1].decimals,
        );
        this.pools = pools;
        this.tokens = tokens;
        this.inputAmount = TokenAmount.fromRawAmount(tokenIn, inputAmountRaw);
        this.outputAmount = TokenAmount.fromRawAmount(
            tokenOut,
            outputAmountRaw,
        );
    }
}

// A Swap can be a single or multiple paths
export class Swap {
    public constructor({
        chainId,
        paths,
        swapKind,
    }: { chainId: number; paths: Path[]; swapKind: SwapKind }) {
        if (paths.length === 0)
            throw new Error('Invalid swap: must contain at least 1 path.');

        this.paths = paths.map(
            (p) =>
                new PathWithAmount(
                    chainId,
                    p.tokens,
                    p.pools,
                    p.inputAmountRaw,
                    p.outputAmountRaw,
                ),
        );

        // paths with immutable pool balances
        this.pathsImmutable = cloneDeep(this.paths);
        this.chainId = chainId;
        this.swapKind = swapKind;
        this.isBatchSwap = paths.length > 1 || paths[0].pools.length > 1;
        this.assets = [
            ...new Set(paths.flatMap((p) => p.tokens).map((t) => t.address)),
        ];
        const swaps = this.getSwaps(this.paths);

        this.assets = this.assets.map((a) => {
            return this.convertNativeAddressToZero(a);
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

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        const queriesContract = getContract({
            address: BALANCER_QUERIES[this.chainId],
            abi: balancerQueriesAbi,
            client,
        });

        let amount: TokenAmount;
        if (this.isBatchSwap) {
            const { result } = await queriesContract.simulate.queryBatchSwap(
                [
                    this.swapKind,
                    this.swaps as BatchSwapStep[],
                    this.assets,
                    DEFAULT_FUND_MANAGMENT,
                ],
                {
                    blockNumber: block,
                },
            );

            amount =
                this.swapKind === SwapKind.GivenIn
                    ? TokenAmount.fromRawAmount(
                          this.outputAmount.token,
                          abs(
                              result[
                                  this.assets.indexOf(
                                      this.convertNativeAddressToZero(
                                          this.outputAmount.token.address,
                                      ),
                                  )
                              ],
                          ),
                      )
                    : TokenAmount.fromRawAmount(
                          this.inputAmount.token,
                          abs(
                              result[
                                  this.assets.indexOf(
                                      this.convertNativeAddressToZero(
                                          this.inputAmount.token.address,
                                      ),
                                  )
                              ],
                          ),
                      );
        } else {
            const { result } = await queriesContract.simulate.querySwap(
                [this.swaps as SingleSwap, DEFAULT_FUND_MANAGMENT],
                { blockNumber: block },
            );

            amount =
                this.swapKind === SwapKind.GivenIn
                    ? TokenAmount.fromRawAmount(this.outputAmount.token, result)
                    : TokenAmount.fromRawAmount(this.inputAmount.token, result);
        }

        return amount;
    }

    private convertNativeAddressToZero(address: Address): Address {
        return address === NATIVE_ADDRESS ? ZERO_ADDRESS : address;
    }

    public queryCallData(): string {
        let callData: string;
        if (this.isBatchSwap) {
            callData = encodeFunctionData({
                abi: balancerQueriesAbi,
                functionName: 'queryBatchSwap',
                args: [
                    this.swapKind,
                    this.swaps as BatchSwapStep[],
                    this.assets,
                    DEFAULT_FUND_MANAGMENT,
                ],
            });
        } else {
            callData = encodeFunctionData({
                abi: balancerQueriesAbi,
                functionName: 'querySwap',
                args: [this.swaps as SingleSwap, DEFAULT_FUND_MANAGMENT],
            });
        }
        return callData;
    }

    public get priceImpact(): PriceImpactAmount {
        const paths = this.pathsImmutable;

        const pathsReverse = paths.map(
            (path) =>
                new PathWithAmount(
                    this.chainId,
                    [...path.tokens].reverse(),
                    [...path.pools].reverse(),
                    path.outputAmount.amount, // TODO - Is this correct scale?
                    path.inputAmount.amount,
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

    // TODO - Need to add Limits, Call construction etc as in this PR: https://github.com/balancer/b-sdk/pull/220

    // helper methods

    private getSwaps(paths: PathWithAmount[]) {
        let swaps: BatchSwapStep[] | SingleSwap;
        if (this.isBatchSwap) {
            swaps = [] as BatchSwapStep[];
            if (this.swapKind === SwapKind.GivenIn) {
                paths.map((p) => {
                    p.pools.map((pool, i) => {
                        (swaps as BatchSwapStep[]).push({
                            poolId: pool, // TODO - Expect ID but currently using Address
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
                            poolId: pool, // TODO - Expect ID but currently using Address
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
            const assetIn = this.convertNativeAddressToZero(
                path.tokens[0].address,
            );
            const assetOut = this.convertNativeAddressToZero(
                path.tokens[1].address,
            );
            swaps = {
                poolId: pool, // TODO - Expect ID but currently using Address
                kind: this.swapKind,
                assetIn,
                assetOut,
                amount:
                    this.swapKind === SwapKind.GivenIn // TODO - Double check
                        ? path.inputAmount.amount
                        : path.outputAmount.amount,
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
