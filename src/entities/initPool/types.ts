import { Address } from 'viem';
import {
    AddLiquidityBaseInput,
    AddLiquidityBuildOutput,
    AddLiquidityKind,
} from '../addLiquidity/types';
import { InputAmountInit } from '../../types';
import { PoolState } from '../types';

export interface InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}

export type InitPoolBuildOutput = Omit<
    AddLiquidityBuildOutput,
    'minBptOut' | 'maxAmountsIn'
>;

export type InitPoolInput = Omit<AddLiquidityBaseInput, 'rpcUrl'> & {
    sender: Address;
    recipient: Address;
    amountsIn: InputAmountInit[];
    kind: AddLiquidityKind.Init;
};

export type InitPoolConfig = {
    initPoolTypes: Record<string, InitPoolBase>;
};
