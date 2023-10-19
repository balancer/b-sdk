import { Client, PublicActions, TestActions, WalletActions } from "viem";
import { Address, ChainId, JoinInput, PoolJoin, PoolStateInput, Slippage } from "../../../src";

export type JoinTxInput = {
  client: Client & PublicActions & TestActions & WalletActions;
  poolJoin: PoolJoin;
  joinInput: JoinInput;
  slippage: Slippage;
  poolInput: PoolStateInput;
  testAddress: Address;
  checkNativeBalance: boolean;
  chainId: ChainId;
}