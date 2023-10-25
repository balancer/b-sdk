import { Address, Hex } from '../../types';
import { ChainId } from '../../utils';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolKind } from '../types';

export type NestedJoinInput = {
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

export type NestedJoinCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountIn: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    poolAddress: Address;
    poolType: string;
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

export type NestedJoinQueryResult = {
    callsAttributes: NestedJoinCallAttributes[];
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
};

export type NestedJoinCallInput = NestedJoinQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};
