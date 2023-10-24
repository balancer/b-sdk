import { Address, Hex } from '../../types';
import { ChainId } from '../../utils';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolKind } from '../types';

export type NestedProportionalExitInput = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountOut?: boolean;
    toInternalBalance?: boolean;
};

export type NestedSingleTokenExitInput = NestedProportionalExitInput & {
    tokenOut: Address;
};

export type NestedExitCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountOut: boolean;
    sortedTokens: Token[];
    poolId: Address;
    poolAddress: Address;
    poolType: string;
    kind: PoolKind;
    sender: Address;
    recipient: Address;
    bptAmountIn: {
        amount: bigint;
        isRef: boolean;
    };
    minAmountsOut: bigint[];
    toInternalBalance: boolean;
    outputReferenceKeys: bigint[];
    tokenOutIndex?: number;
};

export type NestedExitQueryResult = {
    callsAttributes: NestedExitCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
};

export type NestedExitCallInput = NestedExitQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};
