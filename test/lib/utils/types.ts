import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    AddLiquidity,
    AddLiquidityInput,
    Address,
    ChainId,
    CreatePool,
    CreatePoolInput,
    InitPool,
    InitPoolInput,
    NestedPoolState,
    PoolState,
    RemoveLiquidityInput,
    RemoveLiquidity,
    Slippage,
    RemoveLiquidityRecoveryInput,
} from '@/.';

export type AddLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolState: PoolState;
    testAddress: Address;
    wethIsEth?: boolean;
    fromInternalBalance?: boolean;
};

export type InitPoolTxInput = Omit<
    AddLiquidityTxInput,
    'addLiquidity' | 'addLiquidityInput'
> & {
    initPoolInput: InitPoolInput;
    initPool: InitPool;
};

export type RemoveLiquidityTxInputBase = {
    client: Client & PublicActions & TestActions & WalletActions;
    removeLiquidity: RemoveLiquidity;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
    wethIsEth?: boolean;
    toInternalBalance?: boolean;
};

export type RemoveLiquidityTxInput = RemoveLiquidityTxInputBase & {
    removeLiquidityInput: RemoveLiquidityInput;
};

export type RemoveLiquidityRecoveryTxInput = RemoveLiquidityTxInputBase & {
    removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput;
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
