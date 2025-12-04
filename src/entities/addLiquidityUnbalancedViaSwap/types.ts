import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { InputAmount } from '@/types';
import { SwapKind } from '@/types';

export type AddLiquidityUnbalancedViaSwapInput = {
    chainId: number;
    rpcUrl: string;
    pool: Address;
    amountsIn: InputAmount[];
    exactTokenIndex: number;
    addLiquidityUserData?: Hex;
    swapUserData?: Hex;
    sender?: Address;
    swapKind?: SwapKind;
    minSwapAmount?: TokenAmount;
    /**
     * When true (and swapKind is GivenIn), the SDK will choose exactBptAmountOut
     * to minimize the adjustable token in as much as possible (subject to Vault
     * constraints such as min swap size), instead of staying as close as
     * possible to the proportional join.
     *
     * Default: false.
     */
    minimizeAdjustableAmount?: boolean;
};
export type AddLiquidityUnbalancedViaSwapQueryOutput = {
    pool: Address;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    chainId: number;
    protocolVersion: 3;
    to: Address;
    addLiquidityUserData: Hex;
    swapUserData: Hex;
    exactToken: Address;
    exactAmount: bigint;
    adjustableTokenIndex: number;
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
    exactBptAmountOut: TokenAmount;
    maxAdjustableAmount: TokenAmount;
};
