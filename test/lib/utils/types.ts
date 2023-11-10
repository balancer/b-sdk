import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    AddLiquidityInput,
    RemoveLiquidityInput,
    PoolExit,
    AddLiquidity,
    PoolStateInput,
    Slippage,
} from '../../../src';

export type AddLiquidityTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};

export type ExitTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolExit: PoolExit;
    removeLiquidityInput: RemoveLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};
