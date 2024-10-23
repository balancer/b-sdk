import { Address, Hex } from 'viem';
import { Slippage } from '@/entities/slippage';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolKind } from '@/entities/types';
import { PoolType } from '@/types';
import { ChainId } from '@/utils';

export type RemoveLiquidityNestedProportionalInputV2 = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    toInternalBalance?: boolean;
};

export type RemoveLiquidityNestedSingleTokenInputV2 =
    RemoveLiquidityNestedProportionalInputV2 & {
        tokenOut: Address;
    };

export type RemoveLiquidityNestedCallAttributesV2 = {
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
    wethIsEth?: boolean;
};

export type RemoveLiquidityNestedQueryOutputV2 = {
    protocolVersion: 2;
    callsAttributes: RemoveLiquidityNestedCallAttributesV2[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
    chainId: ChainId;
};

export type RemoveLiquidityNestedCallInputV2 =
    RemoveLiquidityNestedQueryOutputV2 & {
        slippage: Slippage;
        accountAddress: Address;
        relayerApprovalSignature?: Hex;
        wethIsEth?: boolean;
    };
