import { Address, Hex } from '../../types';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';

export type NestedJoinInput = {
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[];
    chainId: number;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type NestedJoinCallAttributes = {
    chainId: number;
    useNativeAssetAsWrappedAmountIn: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    poolAddress: Address;
    poolType: string;
    kind: number;
    sender: Address;
    recipient: Address;
    maxAmountsIn: {
        amount: bigint;
        isRef: boolean;
    }[];
    minBptOut: bigint;
    fromInternalBalance: boolean;
    outputReferenceKey: bigint;
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
