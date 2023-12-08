import { Address } from 'viem';
import {
    AddLiquidityBaseInput,
    InitPoolBuildOutput,
    AddLiquidityKind,
} from '../addLiquidity/types';
import { InputAmountInit } from '../../types';
import { PoolState } from '../types';

export interface InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}

export type InitPoolInput = AddLiquidityBaseInput & {
    sender: Address;
    recipient: Address;
    amountsIn: InputAmountInit[];
    kind: AddLiquidityKind.Init;
};

export type InitPoolConfig = {
    initPoolTypes: Record<string, InitPoolBase>;
};
