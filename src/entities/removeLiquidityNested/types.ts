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
    toInternalBalance?: boolean;
};

export type RemoveLiquidityNestedSingleTokenInput =
    RemoveLiquidityNestedProportionalInput & {
        tokenOut: Address;
    };

export type RemoveLiquidityNestedCallAttributes = {
    chainId: ChainId;
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
    receiveNativeAsset?: boolean;
};

export type RemoveLiquidityNestedQueryOutput = {
    callsAttributes: RemoveLiquidityNestedCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
    chainId: ChainId;
};

export type RemoveLiquidityNestedCallInput =
    RemoveLiquidityNestedQueryOutput & {
        slippage: Slippage;
        sender: Address;
        recipient: Address;
        relayerApprovalSignature?: Hex;
        receiveNativeAsset?: boolean;
    };
