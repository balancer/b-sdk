import { Address, Hex } from 'viem';
import { InputAmount } from '@/types';
import { RemoveLiquidityKind } from '../removeLiquidity/types';
import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';

export type RemoveLiquidityBoostedProportionalInput = {
    chainId: number;
    rpcUrl: string;
    bptIn: InputAmount;
    /**
     * One address per pool token, in the same order as `poolState.tokens`
     * sorted by `index`. For each slot `i`:
     *   - Pass the pool token address to receive the pool token as-is (no unwrap).
     *   - Pass the ERC4626 underlying address to receive the unwrapped asset.
     *   - Any other address throws a validation error.
     *
     * The ordering requirement is strict: unlike the previous flat-map
     * implementation, addresses are resolved per slot, not as an unordered
     * multiset. This is necessary to correctly handle pools where a plain
     * token and the underlying of an ERC4626 share the same address.
     */
    tokensOut: Address[];
    kind: RemoveLiquidityKind.Proportional;
    sender?: Address;
    userData?: Hex;
};

export type RemoveLiquidityBoostedQueryOutput = {
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind.Proportional;
    unwrapWrapped: boolean[];
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    protocolVersion: 3;
    chainId: number;
    userData: Hex;
    to: Address;
};

export type RemoveLiquidityBoostedBuildCallInput = {
    userData: Hex;
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind.Proportional;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    unwrapWrapped: boolean[];
    protocolVersion: 3;
    chainId: number;
    slippage: Slippage;
    wethIsEth?: boolean;
};
