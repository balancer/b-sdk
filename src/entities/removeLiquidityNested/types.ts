import { Address, Hex, PoolType } from '../../types';
import { ChainId } from '../../utils';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolKind } from '../types';

export type RemoveLiquidityNestedProportionalInput = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountOut?: boolean;
    toInternalBalance?: boolean;
};

export type RemoveLiquidityNestedSingleTokenInput =
    RemoveLiquidityNestedProportionalInput & {
        tokenOut: Address;
    };

export type RemoveLiquidityNestedCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountOut: boolean;
    sortedTokens: Token[];
    poolId: Address;
    poolAddress: Address;
    poolType: PoolType;
    kind: PoolKind;
    sender: Address;
    recipient: Address;
    bptAmountIn: {
        amount: bigint;
        isRef: boolean;
    };
    minAmountsOut: bigint[];
    toInternalBalance: boolean;
    outputReferences: {
        key: bigint;
        index: bigint;
    }[];
    tokenOutIndex?: number;
};

export type RemoveLiquidityNestedQueryOutput = {
    callsAttributes: RemoveLiquidityNestedCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
};

export type RemoveLiquidityNestedCallInput =
    RemoveLiquidityNestedQueryOutput & {
        slippage: Slippage;
        sender: Address;
        recipient: Address;
        relayerApprovalSignature?: Hex;
    };
