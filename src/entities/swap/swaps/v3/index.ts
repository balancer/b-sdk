import {
    PublicClient,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { TokenAmount } from '../../../tokenAmount';
import { SwapKind, Hex } from '../../../../types';
import {
    DEFAULT_USERDATA,
    BALANCER_ROUTER,
    NATIVE_ASSETS,
    BALANCER_BATCH_ROUTER,
    MAX_UINT256,
    CHAINS,
} from '../../../../utils';
import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionV3Abi,
    vaultV3Abi,
} from '../../../../abi';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
} from '../../types';
import { PathWithAmount } from '../../paths/pathWithAmount';
import { getInputAmount, getOutputAmount } from '../../paths/pathHelpers';
import {
    SingleTokenExactIn,
    SingleTokenExactOut,
    SwapPathExactAmountIn,
    SwapPathExactAmountInWithLimit,
    SwapPathExactAmountOut,
    SwapPathExactAmountOutWithLimit,
} from './types';
import { balancerBatchRouterAbi } from '@/abi/balancerBatchRouter';
import { SwapBase } from '../types';
import { getLimitAmount, getPathLimits } from '../../limits';
import { Permit2 } from '@/entities/permit2Helper';

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
                    p.isBuffer,
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
            chain: CHAINS[this.chainId],
            transport: rpcUrl ? http(rpcUrl) : http(),
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
            abi: [
                ...balancerRouterAbi,
                ...vaultV3Abi,
                ...vaultExtensionV3Abi,
                ...permit2Abi,
            ],
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
                amountIn: this.inputAmount,
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
                amountOut: this.outputAmount,
            };
        }
        throw Error('Unsupported V3 Query');
    }

    private getSwapsWithLimits(pathLimits?: bigint[]): {
        swapsWithLimits:
            | SwapPathExactAmountInWithLimit[]
            | SwapPathExactAmountOutWithLimit[];
        totalPathLimits: bigint;
    } {
        let totalPathLimits = 0n;
        if (this.swapKind === SwapKind.GivenIn) {
            const swapsWithLimits = (this.swaps as SwapPathExactAmountIn[]).map(
                (s, i) => {
                    const minAmountOut = pathLimits ? pathLimits[i] : 0n;
                    totalPathLimits += minAmountOut;
                    return {
                        ...s,
                        minAmountOut,
                    };
                },
            );
            return { swapsWithLimits, totalPathLimits };
        }
        const swapsWithLimits = (this.swaps as SwapPathExactAmountOut[]).map(
            (s, i) => {
                const maxAmountIn = pathLimits ? pathLimits[i] : 0n;
                totalPathLimits += maxAmountIn;
                return {
                    ...s,
                    maxAmountIn,
                };
            },
        );
        return { swapsWithLimits, totalPathLimits };
    }

    private async queryBatchSwap(
        client: PublicClient,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        // Note - batchSwaps are made via the Batch Router
        const batchRouterContract = getContract({
            address: BALANCER_BATCH_ROUTER[this.chainId],
            abi: [
                ...balancerBatchRouterAbi,
                ...vaultV3Abi,
                ...vaultExtensionV3Abi,
                ...permit2Abi,
            ],
            client,
        });
        /*
        In V3 all paths must have individual limits set using minAmountOut/maxAmountIn. 
        pathAmountsOut/In returned by query can be used along with slippage to set these correctly.
        */
        const swapsWithLimits = this.getSwapsWithLimits();

        if (this.swapKind === SwapKind.GivenIn) {
            const { result } =
                await batchRouterContract.simulate.querySwapExactIn(
                    [
                        swapsWithLimits.swapsWithLimits as SwapPathExactAmountInWithLimit[],
                        DEFAULT_USERDATA,
                    ],
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
                amountIn: this.inputAmount,
                pathAmounts: result[0] as bigint[],
            };
        }

        const { result } = await batchRouterContract.simulate.querySwapExactOut(
            [
                swapsWithLimits.swapsWithLimits as SwapPathExactAmountOutWithLimit[],
                DEFAULT_USERDATA,
            ],
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
            amountOut: this.outputAmount,
            pathAmounts: result[0] as bigint[],
        };
    }

    public queryCallData(): string {
        let callData: string;
        if (this.isBatchSwap) {
            const swapsWithLimits = this.getSwapsWithLimits();

            if (this.swapKind === SwapKind.GivenIn) {
                callData = encodeFunctionData({
                    abi: balancerBatchRouterAbi,
                    functionName: 'querySwapExactIn',
                    args: [
                        swapsWithLimits.swapsWithLimits as SwapPathExactAmountInWithLimit[],
                        DEFAULT_USERDATA,
                    ],
                });
            } else {
                callData = encodeFunctionData({
                    abi: balancerBatchRouterAbi,
                    functionName: 'querySwapExactOut',
                    args: [
                        swapsWithLimits.swapsWithLimits as SwapPathExactAmountOutWithLimit[],
                        DEFAULT_USERDATA,
                    ],
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
     * @param input
     * @returns
     */
    buildCall(
        input: SwapBuildCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        let limitAmount: TokenAmount;
        let call:
            | Omit<SwapBuildOutputExactIn, 'minAmountOut'>
            | Omit<SwapBuildOutputExactOut, 'maxAmountIn'>;
        if (input.queryOutput.swapKind === SwapKind.GivenIn) {
            limitAmount = getLimitAmount(
                input.slippage,
                SwapKind.GivenIn,
                input.queryOutput.expectedAmountOut,
            );
        } else {
            limitAmount = getLimitAmount(
                input.slippage,
                SwapKind.GivenOut,
                input.queryOutput.expectedAmountIn,
            );
        }
        if (!this.isBatchSwap) {
            call = {
                to: BALANCER_ROUTER[this.chainId],
                callData: this.callDataSingleSwap(
                    limitAmount,
                    input.deadline ?? MAX_UINT256,
                    !!input.wethIsEth,
                ),
                value: this.value(limitAmount, !!input.wethIsEth),
            };
        } else {
            const pathLimits = getPathLimits(
                input.slippage,
                input.queryOutput,
                limitAmount.amount,
            );
            if (!pathLimits)
                throw Error(
                    'V3 BatchSwaps need path limits for call construction',
                );
            call = {
                to: BALANCER_BATCH_ROUTER[this.chainId],
                callData: this.callDataBatchSwap(
                    limitAmount.amount,
                    pathLimits,
                    input.deadline ?? MAX_UINT256,
                    !!input.wethIsEth,
                ),
                value: this.value(limitAmount, !!input.wethIsEth),
            };
        }
        if (this.swapKind === SwapKind.GivenIn) {
            return {
                ...call,
                minAmountOut: limitAmount,
            };
        }
        return {
            ...call,
            maxAmountIn: limitAmount,
        };
    }

    buildCallWithPermit2(
        input: SwapBuildCallInput,
        permit2: Permit2,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        const buildCallOutput = this.buildCall(input);
        const args = [
            [],
            [],
            permit2.batch,
            permit2.signature,
            [buildCallOutput.callData],
        ] as const;

        const callData = encodeFunctionData({
            abi: balancerBatchRouterAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
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
        const swapsWithLimits = this.getSwapsWithLimits(pathLimits);

        if (this.swapKind === SwapKind.GivenIn) {
            if (
                (this.swaps as SwapPathExactAmountIn[]).length !==
                pathLimits.length
            )
                throw Error('Must have a limit for each path.');

            if (swapsWithLimits.totalPathLimits !== limitAmount)
                throw new Error(
                    `minAmountOut mismatch, ${limitAmount} ${swapsWithLimits.totalPathLimits}`,
                );

            callData = encodeFunctionData({
                abi: balancerBatchRouterAbi,
                functionName: 'swapExactIn',
                args: [
                    swapsWithLimits.swapsWithLimits as SwapPathExactAmountInWithLimit[],
                    deadline,
                    wethIsEth,
                    DEFAULT_USERDATA,
                ],
            });
        } else {
            if (
                (this.swaps as SwapPathExactAmountOut[]).length !==
                pathLimits.length
            )
                throw Error('Must have a limit for each path.');

            if (swapsWithLimits.totalPathLimits !== limitAmount)
                throw new Error(
                    `maxAmountIn mismatch, ${limitAmount} ${swapsWithLimits.totalPathLimits}`,
                );
            callData = encodeFunctionData({
                abi: balancerBatchRouterAbi,
                functionName: 'swapExactOut',
                args: [
                    swapsWithLimits.swapsWithLimits as SwapPathExactAmountOutWithLimit[],
                    deadline,
                    wethIsEth,
                    DEFAULT_USERDATA,
                ],
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
                                isBuffer: p.isBuffer[i],
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
                                isBuffer: p.isBuffer[i],
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
