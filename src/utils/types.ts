import { Client, WalletActions, PublicActions } from 'viem';

export type PublicWalletClient = Client & WalletActions & PublicActions;
