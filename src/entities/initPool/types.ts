import { Address, Hex } from 'viem';
import {
    AddLiquidityBaseInput,
    AddLiquidityBuildOutput,
} from '../addLiquidity/types';
import { InputAmount } from '../../types';
import { PoolState } from '../types';

export interface InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}

export type InitPoolBuildOutput = Omit<
    AddLiquidityBuildOutput,
    'minBptOut' | 'maxAmountsIn'
>;

export type InitPoolInput = InitPoolInputV2 | InitPoolInputV3;

export type InitPoolInputV2 = Omit<AddLiquidityBaseInput, 'rpcUrl'> & {
    sender: Address;
    recipient: Address;
    amountsIn: InputAmount[];
    chainId: number;
};

export type InitPoolInputV3 = {
    amountsIn: InputAmount[];
    minBptAmountOut: bigint;
    useNativeAssetAsWrappedAmountIn?: boolean;
    chainId: number;
};

export type InitPoolConfig = {
    initPoolTypes: Record<string, InitPoolBase>;
};

export type InitializeArgs = [
    Address,
    Address[],
    bigint[],
    bigint,
    boolean,
    Hex,
];
