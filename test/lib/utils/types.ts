import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    AddLiquidityInput,
    RemoveLiquidityInput,
    RemoveLiquidity,
    AddLiquidity,
    PoolStateInput,
    Slippage,
    PoolType,
} from '../../../src';
import { CreatePool } from '../../../src/entities/createPool/createPool';
import { CreatePoolInput } from '../../../src/entities/createPool/types';
import { InitPool } from '../../../src/entities/initPool/initPool';
import { InitPoolInput } from '../../../src/entities/initPool/types';

export type AddLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};

export type InitPoolTxInput = Omit<
    AddLiquidityTxInput,
    'addLiquidity' | 'addLiquidityInput'
> & {
    initPoolInput: InitPoolInput;
    initPool: InitPool;
};

export type RemoveLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    removeLiquidity: RemoveLiquidity;
    removeLiquidityInput: RemoveLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};

export type CreatePoolTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolType: PoolType;
    createPool: CreatePool;
    createPoolInput: CreatePoolInput;
    testAddress: Address;
};
