import { Client, WalletActions, PublicActions } from 'viem';

export type ViemClient = Client & WalletActions & PublicActions;
