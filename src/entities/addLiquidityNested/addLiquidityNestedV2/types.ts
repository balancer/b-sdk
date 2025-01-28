import { Address, Hex } from 'viem';
import { PoolType } from '../../../types';
import { ChainId } from '../../../utils';
import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { PoolKind } from '../../types';
import { Slippage } from '@/entities/slippage';
import { AddLiquidityNestedBaseInput } from '../types';

export type AddLiquidityNestedInputV2 = AddLiquidityNestedBaseInput & {
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

export type AddLiquidityNestedQueryOutputV2 = {
    to: Address;
    callsAttributes: AddLiquidityNestedCallAttributes[];
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
    protocolVersion: 2;
};

export type AddLiquidityNestedCallInputV2 = AddLiquidityNestedQueryOutputV2 & {
    slippage: Slippage;
    accountAddress: Address;
    relayerApprovalSignature?: Hex;
    wethIsEth?: boolean;
};
