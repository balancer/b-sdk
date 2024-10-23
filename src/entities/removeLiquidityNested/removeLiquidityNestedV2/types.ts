import { Address, Hex } from 'viem';
import { Slippage } from '@/entities/slippage';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolKind } from '@/entities/types';
import { PoolType } from '@/types';
import { ChainId } from '@/utils';

export type RemoveLiquidityNestedProportionalInput = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    toInternalBalance?: boolean;
};

export type RemoveLiquidityNestedSingleTokenInput =
    RemoveLiquidityNestedProportionalInput & {
        tokenOut: Address;
    };

export type RemoveLiquidityNestedInput =
    | RemoveLiquidityNestedProportionalInput
    | RemoveLiquidityNestedSingleTokenInput;

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
    wethIsEth?: boolean;
};

export type RemoveLiquidityNestedQueryOutput = {
    protocolVersion: 1 | 2 | 3;
    callsAttributes: RemoveLiquidityNestedCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
    chainId: ChainId;
};

export type RemoveLiquidityNestedCallInput =
    RemoveLiquidityNestedQueryOutput & {
        slippage: Slippage;
        accountAddress: Address;
        relayerApprovalSignature?: Hex;
        wethIsEth?: boolean;
    };
