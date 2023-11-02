import { Client, PublicActions, TestActions, WalletActions } from 'viem';
import {
    Address,
    JoinInput,
    PoolJoin,
    PoolStateInput,
    Slippage,
} from '../../../src';

export type JoinTxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolJoin: PoolJoin;
    joinInput: JoinInput;
    slippage: Slippage;
    poolStateInput: PoolStateInput;
    testAddress: Address;
};
