import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    AddLiquidityInput,
    RemoveLiquidityInput,
    RemoveLiquidity,
    AddLiquidity,
    PoolStateInput,
    Slippage,
} from '../../../src';
import { CreatePool } from '../../../src/entities/createPool/createPool';
import { CreatePoolInput } from '../../../src/entities/createPool/types';
import { P } from 'pino';
import { AddLiquidityInit } from '../../../src/entities/addLiquidityInit/addLiquidityInit';

export type AddLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};

export type AddLiquidityInitTxInput = Omit<
    AddLiquidityTxInput,
    'addLiquidity'
> & {
    addLiquidityInit: AddLiquidityInit;
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
    createPool: CreatePool;
    createPoolInput: CreatePoolInput;
    testAddress: Address;
};
