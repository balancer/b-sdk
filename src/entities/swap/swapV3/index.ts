import {
    PublicClient,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { TokenAmount } from '../../tokenAmount';
import { SwapKind, Hex } from '../../../types';
import {
    DEFAULT_USERDATA,
    BALANCER_ROUTER,
    NATIVE_ASSETS,
    BALANCER_BATCH_ROUTER,
} from '../../../utils';
import { balancerRouterAbi } from '../../../abi';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBase,
    SwapBuildOutputBase,
    SwapInput,
} from '../types';
import { PathWithAmount } from '../pathWithAmount';
import { getInputAmount, getOutputAmount } from '../pathHelpers';
import {
    SingleTokenExactIn,
    SingleTokenExactOut,
    SwapCallBuildV3,
    SwapPathExactAmountIn,
    SwapPathExactAmountOut,
} from './types';
import { balancerBatchRouterAbi } from '@/abi/balancerBatchRouter';

export * from './types';

// A Swap can be a single or multiple paths
export class SwapV3 implements SwapBase {
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
        this.swaps = this.getSwaps(this.paths);
    }

    public readonly chainId: number;
    public readonly isBatchSwap: boolean;
    public readonly paths: PathWithAmount[];
    public readonly swapKind: SwapKind;
    public swaps:
        | SingleTokenExactIn
        | SingleTokenExactOut
        | SwapPathExactAmountIn[]
        | SwapPathExactAmountOut[];
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
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        return this.isBatchSwap
            ? this.queryBatchSwap(client, block)
            : this.querySingleSwap(client, block);
    }

    private async querySingleSwap(
        client: PublicClient,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        const routerContract = getContract({
            address: BALANCER_ROUTER[this.chainId],
            abi: balancerRouterAbi,
            client,
        });
        if ('exactAmountIn' in this.swaps) {
            const { result } =
                await routerContract.simulate.querySwapSingleTokenExactIn(
                    [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountIn,
                        DEFAULT_USERDATA,
                    ],
                    { blockNumber: block },
                );
            return {
                swapKind: SwapKind.GivenIn,
                expectedAmountOut: TokenAmount.fromRawAmount(
                    this.outputAmount.token,
                    result,
                ),
            };
        }
        if ('exactAmountOut' in this.swaps) {
            const { result } =
                await routerContract.simulate.querySwapSingleTokenExactOut(
                    [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountOut,
                        DEFAULT_USERDATA,
                    ],
                    { blockNumber: block },
                );
            return {
                swapKind: SwapKind.GivenOut,
                expectedAmountIn: TokenAmount.fromRawAmount(
                    this.inputAmount.token,
                    result,
                ),
            };
        }
        throw Error('Unsupported V3 Query');
    }

    private async queryBatchSwap(
        client: PublicClient,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        // Note - batchSwaps are made via the Batch Router
        const routerContract = getContract({
            address: BALANCER_BATCH_ROUTER[this.chainId],
            abi: balancerBatchRouterAbi,
            client,
        });
        /*
        In V3 all paths must have individual limits set using minAmountOut/maxAmountIn. 
        pathAmountsOut/In returned by query can be used along with slippage to set these correctly.
        */
        if (this.swapKind === SwapKind.GivenIn) {
            const swapsWithLimits = (this.swaps as SwapPathExactAmountIn[]).map(
                (s) => {
                    return {
                        ...s,
                        minAmountOut: 0n, // we default to 0 for query
                    };
                },
            );
            const { result } = await routerContract.simulate.querySwapExactIn(
                [swapsWithLimits, DEFAULT_USERDATA],
                { blockNumber: block },
            );

            if (result[1].length !== 1)
                throw Error(
                    'Swaps only support paths with matching tokenIn>tokenOut',
                );

            return {
                swapKind: SwapKind.GivenIn,
                expectedAmountOut: TokenAmount.fromRawAmount(
                    this.outputAmount.token,
                    result[2][0],
                ),
                pathAmounts: result[0] as bigint[],
            };
        }

        const swapsWithLimits = (this.swaps as SwapPathExactAmountOut[]).map(
            (s) => {
                return {
                    ...s,
                    maxAmountIn: 0n, // we default to 0 for query
                };
            },
        );
        const { result } = await routerContract.simulate.querySwapExactOut(
            [swapsWithLimits, DEFAULT_USERDATA],
            { blockNumber: block },
        );

        if (result[1].length !== 1)
            throw Error(
                'Swaps only support paths with matching tokenIn>tokenOut',
            );

        return {
            swapKind: SwapKind.GivenOut,
            expectedAmountIn: TokenAmount.fromRawAmount(
                this.inputAmount.token,
                result[2][0],
            ),
            pathAmounts: result[0] as bigint[],
        };
    }

    public queryCallData(): string {
        let callData: string;
        if (this.isBatchSwap) {
            if (this.swapKind === SwapKind.GivenIn) {
                const swapsWithLimits = (
                    this.swaps as SwapPathExactAmountIn[]
                ).map((s) => {
                    return {
                        ...s,
                        minAmountOut: 0n, // we default to 0 for query
                    };
                });
                callData = encodeFunctionData({
                    abi: balancerBatchRouterAbi,
                    functionName: 'querySwapExactIn',
                    args: [swapsWithLimits, DEFAULT_USERDATA],
                });
            } else {
                const swapsWithLimits = (
                    this.swaps as SwapPathExactAmountOut[]
                ).map((s) => {
                    return {
                        ...s,
                        maxAmountIn: 0n, // we default to 0 for query
                    };
                });
                callData = encodeFunctionData({
                    abi: balancerBatchRouterAbi,
                    functionName: 'querySwapExactOut',
                    args: [swapsWithLimits, DEFAULT_USERDATA],
                });
            }
        } else {
            if ('exactAmountIn' in this.swaps) {
                callData = encodeFunctionData({
                    abi: balancerRouterAbi,
                    functionName: 'querySwapSingleTokenExactIn',
                    args: [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountIn,
                        DEFAULT_USERDATA,
                    ],
                });
            } else if ('exactAmountOut' in this.swaps) {
                callData = encodeFunctionData({
                    abi: balancerRouterAbi,
                    functionName: 'querySwapSingleTokenExactOut',
                    args: [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountOut,
                        DEFAULT_USERDATA,
                    ],
                });
            } else throw new Error('Incorrect V3 Swap');
        }
        return callData;
    }

    /**
     * Returns the transaction data to be sent to the router contract
     *
     * @param swapCall
     * @returns
     */
    buildCall(swapCall: SwapCallBuildV3): SwapBuildOutputBase {
        if (!this.isBatchSwap) {
            return {
                to: BALANCER_ROUTER[this.chainId],
                callData: this.callDataSingleSwap(
                    swapCall.limitAmount,
                    swapCall.deadline,
                    swapCall.wethIsEth,
                ),
                value: this.value(swapCall.limitAmount, swapCall.wethIsEth),
            };
        }
        if (!swapCall.pathLimits)
            throw Error('V3 BatchSwaps need path limits for call construction');
        return {
            to: BALANCER_BATCH_ROUTER[this.chainId],
            callData: this.callDataBatchSwap(
                swapCall.limitAmount.amount,
                swapCall.pathLimits,
                swapCall.deadline,
                swapCall.wethIsEth,
            ),
            value: this.value(swapCall.limitAmount, swapCall.wethIsEth),
        };
    }

    /**
     * Returns the call data to be sent to the router contract for a single token swap execution.
     * @param limit minAmountOut/maxAmountIn depending on SwapKind
     * @param deadline
     * @param wethIsEth
     * @returns
     */
    private callDataSingleSwap(
        limit: TokenAmount,
        deadline: bigint,
        wethIsEth: boolean,
    ): Hex {
        let callData: Hex;

        if ('exactAmountIn' in this.swaps) {
            callData = encodeFunctionData({
                abi: balancerRouterAbi,
                functionName: 'swapSingleTokenExactIn',
                args: [
                    this.swaps.pool,
                    this.swaps.tokenIn,
                    this.swaps.tokenOut,
                    this.swaps.exactAmountIn,
                    limit.amount, // minAmountOut
                    deadline,
                    wethIsEth,
                    DEFAULT_USERDATA,
                ],
            });
        } else if ('exactAmountOut' in this.swaps) {
            callData = encodeFunctionData({
                abi: balancerRouterAbi,
                functionName: 'swapSingleTokenExactOut',
                args: [
                    this.swaps.pool,
                    this.swaps.tokenIn,
                    this.swaps.tokenOut,
                    this.swaps.exactAmountOut,
                    limit.amount, // maxAmountIn
                    deadline,
                    wethIsEth,
                    DEFAULT_USERDATA,
                ],
            });
        } else throw new Error('Incorrect V3 Swap');

        return callData;
    }

    /**
     * Returns the call data to be sent to the router contract for batchSwap execution.
     * @param limitAmount total minAmountOut/maxAmountIn depending on SwapKind
     * @param pathLimits individual path minAmountOut/maxAmountIn depending on SwapKind
     * @param deadline
     * @param wethIsEth
     * @returns
     */
    private callDataBatchSwap(
        limitAmount: bigint,
        pathLimits: bigint[],
        deadline: bigint,
        wethIsEth: boolean,
    ): Hex {
        let callData: Hex;
        let totalPathLimits = 0n;

        if (this.swapKind === SwapKind.GivenIn) {
            if (
                (this.swaps as SwapPathExactAmountIn[]).length !==
                pathLimits.length
            )
                throw Error('Must have a limit for each path.');

            const swapsWithLimits = (this.swaps as SwapPathExactAmountIn[]).map(
                (s, i) => {
                    totalPathLimits = totalPathLimits + pathLimits[i];
                    return {
                        ...s,
                        minAmountOut: pathLimits[i],
                    };
                },
            );
            if (totalPathLimits !== limitAmount)
                throw new Error(
                    `minAmountOut mismatch, ${limitAmount} ${totalPathLimits}`,
                );

            callData = encodeFunctionData({
                abi: balancerBatchRouterAbi,
                functionName: 'swapExactIn',
                args: [swapsWithLimits, deadline, wethIsEth, DEFAULT_USERDATA],
            });
        } else {
            if (
                (this.swaps as SwapPathExactAmountOut[]).length !==
                pathLimits.length
            )
                throw Error('Must have a limit for each path.');

            const swapsWithLimits = (
                this.swaps as SwapPathExactAmountOut[]
            ).map((s, i) => {
                totalPathLimits = totalPathLimits + pathLimits[i];
                return {
                    ...s,
                    maxAmountIn: pathLimits[i],
                };
            });
            if (totalPathLimits !== limitAmount)
                throw new Error(
                    `maxAmountIn mismatch, ${limitAmount} ${totalPathLimits}`,
                );
            callData = encodeFunctionData({
                abi: balancerBatchRouterAbi,
                functionName: 'swapExactOut',
                args: [swapsWithLimits, deadline, wethIsEth, DEFAULT_USERDATA],
            });
        }
        return callData;
    }

    /**
     * Returns the native assset value to be sent to the router contract based on the swap kind and the limit amounts
     *
     * @param limit
     * @returns
     */
    private value(limit: TokenAmount, wethIsEth: boolean): bigint {
        let value = 0n;
        if (
            wethIsEth &&
            this.inputAmount.token.address ===
                NATIVE_ASSETS[this.chainId].wrapped
        ) {
            if (this.isBatchSwap) {
                if (this.swapKind === SwapKind.GivenIn) {
                    for (const swap of this.swaps as SwapPathExactAmountIn[]) {
                        value += swap.exactAmountIn;
                    }
                } else {
                    value = limit.amount;
                }
            } else {
                if ('exactAmountIn' in this.swaps)
                    value = this.swaps.exactAmountIn;
                else if ('exactAmountOut' in this.swaps) value = limit.amount;
                else throw new Error('Incorrect V3 Swap');
            }
        }
        return value;
    }

    // helper methods

    private getSwaps(paths: PathWithAmount[]) {
        let swaps:
            | SingleTokenExactIn
            | SingleTokenExactOut
            | SwapPathExactAmountIn[]
            | SwapPathExactAmountOut[];
        if (this.isBatchSwap) {
            if (this.swapKind === SwapKind.GivenIn) {
                swaps = [] as SwapPathExactAmountIn[];
                swaps = paths.map((p) => {
                    return {
                        tokenIn: p.inputAmount.token.address,
                        exactAmountIn: p.inputAmount.amount,
                        steps: p.pools.map((pool, i) => {
                            return {
                                pool: pool,
                                tokenOut: p.tokens[i + 1].address,
                            };
                        }),
                    };
                });
            } else {
                // always use the 'natural' order; (Unlike V2 where order was reversed)
                swaps = [] as SwapPathExactAmountOut[];
                swaps = paths.map((p) => {
                    return {
                        tokenIn: p.inputAmount.token.address,
                        exactAmountOut: p.outputAmount.amount,
                        steps: p.pools.map((pool, i) => {
                            return {
                                pool: pool,
                                tokenOut: p.tokens[i + 1].address,
                            };
                        }),
                    };
                });
            }
        } else {
            const path = paths[0];
            const pool = path.pools[0];
            const tokenIn = path.tokens[0].address;
            const tokenOut = path.tokens[1].address;
            if (this.swapKind === SwapKind.GivenIn) {
                swaps = {
                    pool,
                    tokenIn,
                    tokenOut,
                    exactAmountIn: path.inputAmount.amount,
                };
            } else {
                swaps = {
                    pool,
                    tokenIn,
                    tokenOut,
                    exactAmountOut: path.outputAmount.amount,
                };
            }
        }
        return swaps;
    }
}
