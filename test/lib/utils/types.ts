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
    RemoveLiquidityRecoveryInput,
    Hex,
} from '@/.';
import { CreatePool } from '@/entities/createPool';
import { CreatePoolInput } from '@/entities/createPool/types';
import { InitPool } from '@/entities/initPool';
import { InitPoolInput } from '@/entities/initPool/types';
import { PermitApproval } from '@/entities/permit';
import { Permit2Batch } from '@/entities/permit2';

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

export type AddLiquidityWithSignatureTxInput = AddLiquidityTxInput &
    Permit2BatchAndSignature;

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

export type PermitBatchAndSignature = {
    permitBatch: PermitApproval;
    permitSignature: Hex;
};

export type Permit2BatchAndSignature = {
    permit2Batch: Permit2Batch;
    permit2Signature: Hex;
};

export type RemoveLiquidityWithSignatureTxInput = RemoveLiquidityTxInput &
    PermitBatchAndSignature;

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
