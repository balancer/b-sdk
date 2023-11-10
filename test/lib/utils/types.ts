import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    AddLiquidityInput,
    ExitInput,
    PoolExit,
    PoolJoin,
    PoolStateInput,
    Slippage,
} from '../../../src';

export type JoinTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolJoin: PoolJoin;
    addLiquidityInput: AddLiquidityInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};

export type ExitTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolExit: PoolExit;
    exitInput: ExitInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};
