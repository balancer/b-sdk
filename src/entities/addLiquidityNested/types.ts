import { Address, Hex, InputAmount, PoolType } from '../../types';
import { ChainId } from '../../utils';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolKind } from '../types';

export type AddLiquidityNestedInput = {
    amountsIn: InputAmount[];
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    fromInternalBalance?: boolean;
};

export type AddLiquidityNestedCallAttributes = {
    chainId: ChainId;
    wethIsEth?: boolean;
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

export type AddLiquidityNestedQueryOutput = {
    callsAttributes: AddLiquidityNestedCallAttributes[];
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
};

export type AddLiquidityNestedCallInput = AddLiquidityNestedQueryOutput & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
    wethIsEth?: boolean;
};
