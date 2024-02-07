import { TokenAmount } from './tokenAmount';
import { SingleSwap, SwapKind, BatchSwapStep, Hex } from '../types';
import {
    abs,
    BALANCER_QUERIES,
    DEFAULT_USERDATA,
    DEFAULT_FUND_MANAGMENT,
    ZERO_ADDRESS,
    NATIVE_ADDRESS,
    MathSol,
    VAULT,
} from '../utils';
import {
    Address,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { balancerQueriesAbi, vaultV2Abi } from '../abi';
import { PriceImpactAmount } from './priceImpactAmount';
import cloneDeep from 'lodash.clonedeep';
import { Token } from './token';
import { MinimalToken } from '..';
import { Slippage } from './slippage';

export type TokenApi = Omit<MinimalToken, 'index'>;

export type Path = {
    pools: Address[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
    balancerVersion: 2 | 3;
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
                    path.outputAmount.amount,
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

    /**
     * Takes a slippage acceptable by the user and returns the limits for a swap to be executed
     *
     * @param slippage percentage: 5 for 5%
     * @param expectedAmount is the amount that the user expects to receive or send, can be obtained from swap.query()
     * @returns
     */
    limits(slippage: Slippage, expectedAmount: TokenAmount): bigint[] {
        const limits = new Array(this.assets.length).fill(0n);
        let limitAmount: bigint;
        if (this.swapKind === SwapKind.GivenIn) {
            limitAmount = slippage.applyTo(expectedAmount.amount, -1);
        } else {
            limitAmount = slippage.applyTo(expectedAmount.amount);
        }

        if (!this.isBatchSwap) {
            return [limitAmount];
        }

        for (let i = 0; i < this.assets.length; i++) {
            if (
                this.assets[i] === this.inputAmount.token.address ||
                (this.assets[i] === ZERO_ADDRESS &&
                    this.inputAmount.token.address === NATIVE_ADDRESS)
            ) {
                if (this.swapKind === SwapKind.GivenIn) {
                    limits[i] = this.inputAmount.amount;
                } else {
                    limits[i] = limitAmount;
                }
            }
            if (
                this.assets[i] === this.outputAmount.token.address ||
                (this.assets[i] === ZERO_ADDRESS &&
                    this.outputAmount.token.address === NATIVE_ADDRESS)
            ) {
                if (this.swapKind === SwapKind.GivenIn) {
                    limits[i] = -1n * limitAmount;
                } else {
                    limits[i] = -1n * this.outputAmount.amount;
                }
            }
        }

        return limits;
    }

    /**
     * Returns the transaction data to be sent to the vault contract
     *
     * @param limits calculated from swap.limits()
     * @param deadline unix timestamp
     * @param sender address of the sender
     * @param recipient defaults to sender
     * @returns
     */
    transactionData(
        limits: bigint[],
        deadline: bigint,
        sender: Address,
        recipient = sender,
    ) {
        return {
            to: this.to(),
            data: this.callData(limits, deadline, sender, recipient),
            value: this.value(limits),
        };
    }

    /**
     * Returns the native assset value to be sent to the vault contract based on the swap kind and the limit amounts
     *
     * @param limits calculated from swap.limits()
     * @returns
     */
    private value(limits: bigint[]): bigint {
        let value = 0n;
        if (this.inputAmount.token.address === NATIVE_ADDRESS) {
            const idx = this.assets.indexOf(ZERO_ADDRESS);
            value = limits[idx];
        }
        return value;
    }

    private to(): Address {
        return VAULT[this.chainId];
    }

    /**
     * Returns the call data to be sent to the vault contract for the swap execution.
     *
     * @param limits calculated from swap.limits()
     * @param deadline unix timestamp
     * @param sender address of the sender
     * @param recipient defaults to sender
     * @returns
     */
    private callData(
        limits: bigint[],
        deadline: bigint,
        sender: Address,
        recipient = sender,
        internalBalances = {
            to: false,
            from: false,
        },
    ): Hex {
        let callData: Hex;

        const funds = {
            sender,
            recipient,
            fromInternalBalance: internalBalances.from,
            toInternalBalance: internalBalances.to,
        };

        if (this.isBatchSwap) {
            callData = encodeFunctionData({
                abi: vaultV2Abi,
                functionName: 'batchSwap',
                args: [
                    this.swapKind,
                    this.swaps as BatchSwapStep[],
                    this.assets,
                    funds,
                    limits,
                    deadline,
                ],
            });
        } else {
            callData = encodeFunctionData({
                abi: vaultV2Abi,
                functionName: 'swap',
                args: [this.swaps as SingleSwap, funds, limits[0], deadline],
            });
        }

        return callData;
    }

    // helper methods

    private getSwaps(paths: PathWithAmount[]) {
        let swaps: BatchSwapStep[] | SingleSwap;
        if (this.isBatchSwap) {
            swaps = [] as BatchSwapStep[];
            if (this.swapKind === SwapKind.GivenIn) {
                paths.map((p) => {
                    p.pools.map((pool, i) => {
                        (swaps as BatchSwapStep[]).push({
                            poolId: pool,
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
                            poolId: pool,
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
                poolId: pool,
                kind: this.swapKind,
                assetIn,
                assetOut,
                amount:
                    this.swapKind === SwapKind.GivenIn
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
