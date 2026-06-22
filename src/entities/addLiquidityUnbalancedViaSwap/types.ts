import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { InputAmount } from '@/types';
import { AddLiquidityBaseQueryOutput } from '../addLiquidity/types';

export type AddLiquidityUnbalancedViaSwapInput = {
    chainId: number;
    rpcUrl: string;
    expectedAdjustableAmountIn: InputAmount;
    addLiquidityUserData?: Hex;
    swapUserData?: Hex;
    sender?: Address;
};

/**
 * Query output for add liquidity unbalanced via swap.
 *
 * Extends {@link AddLiquidityBaseQueryOutput} for generic add-liquidity consumers.
 * `amountsIn` holds **budget** amounts in sorted token order (not simulated router
 * consumption); the adjustable slot matches `expectedAdjustableAmountIn`.
 *
 * Use flow-specific fields for `buildCall` and Permit2:
 * - `pool` — router address argument (distinct from `poolId`)
 * - `expectedAdjustableAmountIn` — user budget; Permit2 signs budget + slippage
 *
 * Generic `signAddLiquidityApproval` does not apply; use
 * `signAddLiquidityUnbalancedViaSwapApproval` instead.
 */
export type AddLiquidityUnbalancedViaSwapQueryOutput =
    AddLiquidityBaseQueryOutput & {
        protocolVersion: 3;
        pool: Address;
        exactAmountIn: TokenAmount;
        expectedAdjustableAmountIn: TokenAmount;
        addLiquidityUserData: Hex;
        swapUserData: Hex;
    };

export type AddLiquidityUnbalancedViaSwapBuildCallInput = {
    slippage: Slippage;
    wethIsEth?: boolean;
    deadline: bigint;
} & AddLiquidityUnbalancedViaSwapQueryOutput;

export type AddLiquidityUnbalancedViaSwapBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    bptOut: TokenAmount;
    expectedAdjustableAmountIn: TokenAmount;
    maxAdjustableAmountIn: TokenAmount;
};
