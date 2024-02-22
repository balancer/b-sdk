import { TokenAmount } from '../../tokenAmount';
import { SingleSwap, SwapKind, BatchSwapStep, Hex } from '../../../types';
import {
    abs,
    BALANCER_QUERIES,
    DEFAULT_USERDATA,
    DEFAULT_FUND_MANAGMENT,
    ZERO_ADDRESS,
    VAULT,
    NATIVE_ASSETS,
    ChainId,
} from '../../../utils';
import {
    Address,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { balancerQueriesAbi, vaultV2Abi } from '../../../abi';
import {
    ExpectedExactIn,
    ExpectedExactOut,
    SwapBase,
    SwapBuildOutputBase,
    SwapInput,
} from '../types';
import { PathWithAmount } from '../pathWithAmount';
import { getInputAmount, getOutputAmount } from '../pathHelpers';
import { SwapCallBuildV2 } from './types';

export * from './types';

// A Swap can be a single or multiple paths
export class SwapV2 implements SwapBase {
    public constructor({ chainId, paths, swapKind }: SwapInput) {
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

        this.chainId = chainId;
        this.swapKind = swapKind;
        this.inputAmount = getInputAmount(this.paths);
        this.outputAmount = getOutputAmount(this.paths);
        this.isBatchSwap = paths.length > 1 || paths[0].pools.length > 1;
        this.assets = [
            ...new Set(paths.flatMap((p) => p.tokens).map((t) => t.address)),
        ];
        const swaps = this.getSwaps(this.paths);
        this.swaps = swaps;
    }

    public readonly chainId: number;
    public readonly isBatchSwap: boolean;
    public readonly paths: PathWithAmount[];
    public readonly assets: Address[];
    public readonly swapKind: SwapKind;
    public swaps: BatchSwapStep[] | SingleSwap;
    public readonly inputAmount: TokenAmount;
    public readonly outputAmount: TokenAmount;

    public get quote(): TokenAmount {
        return this.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(
        rpcUrl?: string,
        block?: bigint,
    ): Promise<ExpectedExactIn | ExpectedExactOut> {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        const queriesContract = getContract({
            address: BALANCER_QUERIES[this.chainId],
            abi: balancerQueriesAbi,
            client,
        });
        return this.isBatchSwap
            ? this.queryBatchSwap(queriesContract, block)
            : this.querySingleSwap(queriesContract, block);
    }

    private async querySingleSwap(
        queriesContract,
        block?: bigint,
    ): Promise<ExpectedExactIn | ExpectedExactOut> {
        const { result } = await queriesContract.simulate.querySwap(
            [this.swaps as SingleSwap, DEFAULT_FUND_MANAGMENT],
            { blockNumber: block },
        );

        if (this.swapKind === SwapKind.GivenIn) {
            return {
                swapKind: SwapKind.GivenIn,
                expectedAmountOut: TokenAmount.fromRawAmount(
                    this.outputAmount.token,
                    result,
                ),
            };
        }
        return {
            swapKind: SwapKind.GivenOut,
            expectedAmountIn: TokenAmount.fromRawAmount(
                this.inputAmount.token,
                result,
            ),
        };
    }

    private async queryBatchSwap(
        queriesContract,
        block?: bigint,
    ): Promise<ExpectedExactIn | ExpectedExactOut> {
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

        if (this.swapKind === SwapKind.GivenIn) {
            return {
                swapKind: SwapKind.GivenIn,
                expectedAmountOut: TokenAmount.fromRawAmount(
                    this.outputAmount.token,
                    abs(
                        result[
                            this.assets.indexOf(this.outputAmount.token.address)
                        ],
                    ),
                ),
            };
        }
        return {
            swapKind: SwapKind.GivenOut,
            expectedAmountIn: TokenAmount.fromRawAmount(
                this.inputAmount.token,
                abs(
                    result[this.assets.indexOf(this.inputAmount.token.address)],
                ),
            ),
        };
    }

    private convertWrappedToZero(chainId: ChainId, address: Address): Address {
        return address.toLowerCase() ===
            NATIVE_ASSETS[chainId].wrapped.toLowerCase()
            ? ZERO_ADDRESS
            : address;
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

    /**
     * Returns the limits for a batchSwap
     *
     * @param limitAmount maxAmountIn/minAmountOut depending on swap kind
     * @returns
     */
    limitsBatchSwap(limitAmount: TokenAmount): bigint[] {
        const limits = new Array(this.assets.length).fill(0n);

        if (!this.isBatchSwap) {
            throw new Error('Limits: Non batchSwap path.');
        }

        for (let i = 0; i < this.assets.length; i++) {
            if (this.assets[i] === this.inputAmount.token.address) {
                if (this.swapKind === SwapKind.GivenIn) {
                    limits[i] = this.inputAmount.amount;
                } else {
                    limits[i] = limitAmount.amount;
                }
            }
            if (this.assets[i] === this.outputAmount.token.address) {
                if (this.swapKind === SwapKind.GivenIn) {
                    limits[i] = -1n * limitAmount.amount;
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
     * @param swapCall
     * @returns
     */
    buildCall(swapCall: SwapCallBuildV2): SwapBuildOutputBase {
        const funds = {
            sender: swapCall.sender,
            recipient: swapCall.recipient,
            fromInternalBalance: false, // Set default to false as not supported in V3 and keeps interface simple
            toInternalBalance: false,
        };
        let callData: Hex;
        if (this.isBatchSwap) {
            const limits = this.limitsBatchSwap(swapCall.limitAmount);
            callData = this.callDataBatchSwap(
                limits,
                swapCall.deadline,
                funds,
                swapCall.wethIsEth,
            );
        } else {
            callData = this.callDataSingleSwap(
                swapCall.limitAmount.amount,
                swapCall.deadline,
                funds,
                swapCall.wethIsEth,
            );
        }
        return {
            to: this.to(),
            callData,
            value: this.value(swapCall.limitAmount, swapCall.wethIsEth),
        };
    }

    /**
     * Returns the native assset value to be sent to the vault contract based on the swap kind and the limit
     *
     * @param limitAmount
     * @returns
     */
    private value(limitAmount: TokenAmount, wethIsEth: boolean): bigint {
        let value = 0n;
        if (
            wethIsEth &&
            this.inputAmount.token.address ===
                NATIVE_ASSETS[this.chainId].wrapped
        ) {
            if (this.swapKind === SwapKind.GivenIn)
                value = this.inputAmount.amount;
            else value = limitAmount.amount;
        }
        return value;
    }

    private to(): Address {
        return VAULT[this.chainId];
    }

    /**
     * Returns the call data to be sent to the vault contract for the swap execution.
     *
     * @param limit Limit amount (minOut for ExactIn, maxIn for ExactOut)
     * @param deadline unix timestamp
     * @param funds FundManagement
     * @returns
     */
    private callDataSingleSwap(
        limit: bigint,
        deadline: bigint,
        funds,
        wethIsEth: boolean,
    ): Hex {
        const swap = { ...this.swaps } as SingleSwap;
        if (wethIsEth) {
            swap.assetIn = this.convertWrappedToZero(
                this.chainId,
                swap.assetIn,
            );
            swap.assetOut = this.convertWrappedToZero(
                this.chainId,
                swap.assetOut,
            );
        }
        return encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'swap',
            args: [swap, funds, limit, deadline],
        });
    }

    /**
     * Returns the call data to be sent to the vault contract for the swap execution.
     *
     * @param limits calculated from swap.limits()
     * @param deadline unix timestamp
     * @param funds FundManagement
     * @returns
     */
    private callDataBatchSwap(
        limits: bigint[],
        deadline: bigint,
        funds,
        wethIsEth: boolean,
    ): Hex {
        return encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'batchSwap',
            args: [
                this.swapKind,
                this.swaps as BatchSwapStep[],
                wethIsEth
                    ? this.assets.map((a) =>
                          this.convertWrappedToZero(this.chainId, a),
                      )
                    : this.assets,
                funds,
                limits,
                deadline,
            ],
        });
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
            const path = paths[0];
            const pool = path.pools[0];
            swaps = {
                poolId: pool,
                kind: this.swapKind,
                assetIn: path.tokens[0].address,
                assetOut: path.tokens[1].address,
                amount:
                    this.swapKind === SwapKind.GivenIn
                        ? path.inputAmount.amount
                        : path.outputAmount.amount,
                userData: DEFAULT_USERDATA,
            } as SingleSwap;
        }
        return swaps;
    }
}
