import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    ChainId,
    ExitInput,
    JoinInput,
    PoolExit,
    PoolJoin,
    PoolStateInput,
    Slippage,
} from '../../../src';

type TxInputBase = {
    client: Client & PublicActions & TestActions & WalletActions;
    slippage: Slippage;
    poolInput: PoolStateInput;
    testAddress: Address;
    checkNativeBalance: boolean;
    chainId: ChainId;
};

export type JoinTxInput = TxInputBase & {
    poolJoin: PoolJoin;
    joinInput: JoinInput;
};

export type ExitTxInput = TxInputBase & {
    poolExit: PoolExit;
    exitInput: ExitInput;
};
