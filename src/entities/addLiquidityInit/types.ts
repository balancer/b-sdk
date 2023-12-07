import { Address } from 'viem';
import {
    AddLiquidityBaseInput,
    AddLiquidityBuildOutput,
    AddLiquidityKind,
} from '../addLiquidity/types';
import { InitInputAmount } from '../../types';
import { PoolState } from '../types';

export interface AddLiquidityInitBase {
    buildCall(
        input: AddLiquidityInitInput,
        poolState: PoolState,
    ): AddLiquidityBuildOutput;
}

export type AddLiquidityInitInput = AddLiquidityBaseInput & {
    sender: Address;
    recipient: Address;
    amountsIn: InitInputAmount[];
    kind: AddLiquidityKind.Init;
};

export type AddLiquidityInitConfig = {
    customAddLiquidityInitTypes: Record<string, AddLiquidityInitBase>;
};
