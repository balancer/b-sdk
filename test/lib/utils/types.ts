import { ViemClient } from '@/utils/types';
import { TestActions } from 'viem';
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
    client: ViemClient & TestActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolState: PoolState;
    testAddress: Address;
    wethIsEth?: boolean;
    fromInternalBalance?: boolean;
    usePermit2Signatures?: boolean;
};

export type InitPoolTxInput = Omit<
    AddLiquidityTxInput,
    'addLiquidity' | 'addLiquidityInput'
> & {
    initPoolInput: InitPoolInput;
    initPool: InitPool;
};

export type RemoveLiquidityTxInputBase = {
    client: ViemClient & TestActions;
    removeLiquidity: RemoveLiquidity;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
    wethIsEth?: boolean;
    toInternalBalance?: boolean;
    usePermitSignatures?: boolean;
};

export type RemoveLiquidityTxInput = RemoveLiquidityTxInputBase & {
    removeLiquidityInput: RemoveLiquidityInput;
};

export type RemoveLiquidityRecoveryTxInput = RemoveLiquidityTxInputBase & {
    removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput;
};

export type CreatePoolTxInput = {
    client: ViemClient & TestActions;
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
    client: ViemClient & TestActions;
    wethIsEth?: boolean;
};
