import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    AddLiquidityInput,
    RemoveLiquidityInput,
    RemoveLiquidity,
    AddLiquidity,
    PoolState,
    Slippage,
    ChainId,
    NestedPoolState,
} from '@/.';
import { CreatePool } from '@/entities/createPool';
import { CreatePoolInput } from '@/entities/createPool/types';
import { InitPool } from '@/entities/initPool';
import { InitPoolInput } from '@/entities/initPool/types';

export type AddLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolState: PoolState;
    testAddress: Address;
    wethIsEth?: boolean;
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
    poolState: PoolState;
    testAddress: Address;
    wethIsEth?: boolean;
};

export type CreatePoolTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    createPool: CreatePool;
    createPoolInput: CreatePoolInput;
    testAddress: Address;
};

export type AddLiquidityNestedTxInput = {
    nestedPoolState: NestedPoolState;
    amountsIn: {
        address: Address; // DAI
        rawAmount: bigint;
        decimals: number;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    client: Client & PublicActions & TestActions & WalletActions;
    wethIsEth?: boolean;
};
