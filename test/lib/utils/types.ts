import { PublicWalletClient } from '@/utils/types';
import { Abi, TestActions } from 'viem';
import {
    AddLiquidity,
    AddLiquidityInput,
    Address,
    ChainId,
    CreatePoolInput,
    InitPoolInput,
    NestedPoolState,
    PoolState,
    RemoveLiquidityInput,
    RemoveLiquidity,
    Slippage,
    RemoveLiquidityRecoveryInput,
} from '@/.';

export type AddLiquidityTxInput = {
    client: PublicWalletClient & TestActions;
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
};

export type RemoveLiquidityTxInputBase = {
    client: PublicWalletClient & TestActions;
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
    client: PublicWalletClient & TestActions;
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
    client: PublicWalletClient & TestActions;
    wethIsEth?: boolean;
};

/**
 * Optional parameters for contract simulation to extract revert reasons
 * Can be created in tests and optionally passed to sendTransactionGetBalances
 */
export type SimulateParams = {
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
    address: Address; // Contract address
    account: Address; // Account address to use for simulation
};
