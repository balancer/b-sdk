import { Address, Hex, PoolType } from '../../types';
import { ChainId } from '../../utils';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolKind } from '../types';

export type AddLiquidityNestedInput = {
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type AddLiquidityNestedCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountIn: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    poolAddress: Address;
    poolType: PoolType;
    kind: PoolKind;
    sender: Address;
    recipient: Address;
    maxAmountsIn: {
        amount: bigint;
        isRef: boolean;
    }[];
    minBptOut: bigint;
    fromInternalBalance: boolean;
    outputReference: bigint;
};

export type AddLiquidityNestedQueryResult = {
    callsAttributes: AddLiquidityNestedCallAttributes[];
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
};

export type AddLiquidityNestedCallInput = AddLiquidityNestedQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};
