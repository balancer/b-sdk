import { Address, Hex } from '../../types';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { MinimalToken } from '../../data';

export type NestedJoinInput = {
    amountsIn: {
        address: Address;
        decimals: number;
        rawAmount: bigint;
    }[];
    chainId: number;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type NestedPool = {
    id: Hex;
    address: Address;
    type: string;
    level: number; // 0 is the bottom and the highest level is the top
    tokens: MinimalToken[]; // each token should have at least one
};

export type NestedPoolState = {
    pools: NestedPool[];
};

export type NestedJoinCall = {
    chainId: number;
    useNativeAssetAsWrappedAmountIn: boolean;
    sortedTokens: Token[];
    poolId: Address;
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
    calls: NestedJoinCall[];
    bptOut: TokenAmount;
};

export type NestedJoinCallInput = NestedJoinQueryResult & {
    chainId: number;
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};
