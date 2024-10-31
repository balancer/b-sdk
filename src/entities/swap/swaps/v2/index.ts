import {
    Address,
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';

import { balancerQueriesAbi, vaultV2Abi } from '../../../../abi';
import { BatchSwapStep, Hex, SingleSwap, SwapKind } from '../../../../types';
import {
    BALANCER_QUERIES,
    CHAINS,
    ChainId,
    DEFAULT_FUND_MANAGMENT,
    DEFAULT_USERDATA,
    MAX_UINT256,
    NATIVE_ASSETS,
    VAULT,
    ZERO_ADDRESS,
    abs,
} from '../../../../utils';
import { TokenAmount } from '../../../tokenAmount';
import { getLimitAmount } from '../../limits';
import { getInputAmount, getOutputAmount } from '../../paths/pathHelpers';
import { PathWithAmount } from '../../paths/pathWithAmount';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
} from '../../types';
import { SwapBase } from '../types';
import { SwapBuildCallInputBaseV2 } from './types';

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
                    p.tokens.map((t) => {
                        return {
                            ...t,
                            address: t.address.toLowerCase() as Address,
                        };
                    }),
                    p.pools.map((pool) => pool.toLowerCase() as Address),
                    p.inputAmountRaw,
                    p.outputAmountRaw,
                    undefined,
                ),
        );

        this.chainId = chainId;
        this.swapKind = swapKind;
        this.inputAmount = getInputAmount(this.paths);
        this.outputAmount = getOutputAmount(this.paths);
        this.isBatchSwap =
            this.paths.length > 1 || this.paths[0].pools.length > 1;
        this.assets = [
            ...new Set(
                this.paths.flatMap((p) => p.tokens).map((t) => t.address),
            ),
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
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        const client = createPublicClient({
            chain: CHAINS[this.chainId],
            transport: rpcUrl ? http(rpcUrl) : http(),
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
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
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
                amountIn: this.inputAmount,
            };
        }
        return {
            swapKind: SwapKind.GivenOut,
            expectedAmountIn: TokenAmount.fromRawAmount(
                this.inputAmount.token,
                result,
            ),
            amountOut: this.outputAmount,
        };
    }

    private async queryBatchSwap(
        queriesContract,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
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
                amountIn: this.inputAmount,
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
            amountOut: this.outputAmount,
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
     * @param input
     * @returns
     */
    buildCall(
        input: SwapBuildCallInput & SwapBuildCallInputBaseV2,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        let limitAmount: TokenAmount;
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
        const funds = {
            sender: input.sender,
            recipient: input.recipient,
            fromInternalBalance: false, // Set default to false as not supported in V3 and keeps interface simple
            toInternalBalance: false,
        };
        let callData: Hex;
        if (this.isBatchSwap) {
            const limits = this.limitsBatchSwap(limitAmount);
            callData = this.callDataBatchSwap(
                limits,
                input.deadline ?? MAX_UINT256,
                funds,
                !!input.wethIsEth,
            );
        } else {
            callData = this.callDataSingleSwap(
                limitAmount.amount,
                input.deadline ?? MAX_UINT256,
                funds,
                !!input.wethIsEth,
            );
        }
        if (this.swapKind === SwapKind.GivenIn) {
            return {
                to: VAULT[this.chainId],
                callData,
                value: this.value(limitAmount, !!input.wethIsEth),
                minAmountOut: limitAmount,
            };
        }
        return {
            to: VAULT[this.chainId],
            callData,
            value: this.value(limitAmount, !!input.wethIsEth),
            maxAmountIn: limitAmount,
        };
    }

    buildCallWithPermit2(): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        throw new Error('buildCallWithPermit2 is not supported on v2');
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
