import {
    Address,
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
} from '../../../utils';
import { balancerRouterAbi } from '../../../abi';
import {
    SwapBase,
    SwapBuildOutputBase,
    SwapCallBuild,
    SwapInputV3,
} from '../types';
import { PathWithAmount } from '../pathWithAmount';
import { getInputAmount, getOutputAmount } from '../pathHelpers';
import { SingleTokenExactIn, SingleTokenExactOut } from './types';

export * from './types';

// A Swap can be a single or multiple paths
export class SwapV3 implements SwapBase {
    public constructor({ chainId, paths, swapKind, wethIsEth }: SwapInputV3) {
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
        this.wethIsEth = wethIsEth;
        this.swaps = this.getSwaps(this.paths);
    }

    public readonly chainId: number;
    public readonly isBatchSwap: boolean;
    public readonly paths: PathWithAmount[];
    public readonly swapKind: SwapKind;
    public swaps: SingleTokenExactIn | SingleTokenExactOut;
    public readonly inputAmount: TokenAmount;
    public readonly outputAmount: TokenAmount;
    public readonly wethIsEth: boolean;

    // TODO - this could be moved to base swap?
    public get quote(): TokenAmount {
        return this.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        const routerContract = getContract({
            address: BALANCER_ROUTER[this.chainId],
            abi: balancerRouterAbi,
            client,
        });

        let amount: TokenAmount;
        if (this.isBatchSwap) {
            // TODO - Implement this once router available
            console.error('BatchSwap not implemented');
            amount = TokenAmount.fromHumanAmount(this.outputAmount.token, '0');
        } else {
            if ('exactAmountIn' in this.swaps) {
                const { result } =
                    await routerContract.simulate.querySwapExactIn(
                        [
                            this.swaps.pool,
                            this.swaps.tokenIn,
                            this.swaps.tokenOut,
                            this.swaps.exactAmountIn,
                            DEFAULT_USERDATA,
                        ],
                        { blockNumber: block },
                    );
                amount = TokenAmount.fromRawAmount(
                    this.outputAmount.token,
                    result,
                );
            } else if ('exactAmountOut' in this.swaps) {
                const { result } =
                    await routerContract.simulate.querySwapExactOut(
                        [
                            this.swaps.pool,
                            this.swaps.tokenIn,
                            this.swaps.tokenOut,
                            this.swaps.exactAmountOut,
                            DEFAULT_USERDATA,
                        ],
                        { blockNumber: block },
                    );
                amount = TokenAmount.fromRawAmount(
                    this.inputAmount.token,
                    result,
                );
            } else throw new Error('Incorrect V3 Swap');
        }

        return amount;
    }

    public queryCallData(): string {
        let callData: string;
        if (this.isBatchSwap) {
            // TODO - Implement this once router available
            console.error('BatchSwap not implemented');
            callData = '';
        } else {
            if ('exactAmountIn' in this.swaps) {
                callData = encodeFunctionData({
                    abi: balancerRouterAbi,
                    functionName: 'querySwapExactIn',
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
                    functionName: 'querySwapExactOut',
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
     * Returns the transaction data to be sent to the vault contract
     *
     * @param swapCall
     * @returns
     */
    buildCall(swapCall: SwapCallBuild): SwapBuildOutputBase {
        return {
            to: this.to(),
            callData: this.callData(swapCall.limitAmount, swapCall.deadline),
            value: this.value(swapCall.limitAmount),
        };
    }

    /**
     * Returns the native assset value to be sent to the vault contract based on the swap kind and the limit amounts
     *
     * @param limit
     * @returns
     */
    private value(limit: TokenAmount): bigint {
        let value = 0n;
        if (
            this.wethIsEth &&
            this.inputAmount.token.address ===
                NATIVE_ASSETS[this.chainId].wrapped
        ) {
            if ('exactAmountIn' in this.swaps) value = this.swaps.exactAmountIn;
            else if ('exactAmountOut' in this.swaps) value = limit.amount;
            else throw new Error('Incorrect V3 Swap');
        }
        return value;
    }

    private to(): Address {
        return BALANCER_ROUTER[this.chainId];
    }

    /**
     * Returns the call data to be sent to the vault contract for the swap execution.
     *
     * @param limit calculated from swap.limits()
     * @param deadline unix timestamp
     * @returns
     */
    private callData(limit: TokenAmount, deadline: bigint): Hex {
        let callData: Hex;

        if (this.isBatchSwap) {
            // TODO - Implement this once router available
            console.error('BatchSwap not implemented');
            callData = '0x';
        } else {
            if ('exactAmountIn' in this.swaps) {
                callData = encodeFunctionData({
                    abi: balancerRouterAbi,
                    functionName: 'swapExactIn',
                    args: [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountIn,
                        limit.amount, // minAmountOut
                        deadline,
                        this.wethIsEth,
                        DEFAULT_USERDATA,
                    ],
                });
            } else if ('exactAmountOut' in this.swaps) {
                callData = encodeFunctionData({
                    abi: balancerRouterAbi,
                    functionName: 'swapExactOut',
                    args: [
                        this.swaps.pool,
                        this.swaps.tokenIn,
                        this.swaps.tokenOut,
                        this.swaps.exactAmountOut,
                        limit.amount, // maxAmountIn
                        deadline,
                        this.wethIsEth,
                        DEFAULT_USERDATA,
                    ],
                });
            } else throw new Error('Incorrect V3 Swap');
        }
        return callData;
    }

    // helper methods

    private getSwaps(paths: PathWithAmount[]) {
        let swaps: SingleTokenExactIn | SingleTokenExactOut;
        if (this.isBatchSwap) {
            // TODO - Implement this once router available
            swaps = {} as SingleTokenExactIn;
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
                } as SingleTokenExactIn;
            } else {
                swaps = {
                    pool,
                    tokenIn,
                    tokenOut,
                    exactAmountOut: path.outputAmount.amount,
                } as SingleTokenExactOut;
            }
        }
        return swaps;
    }
}
