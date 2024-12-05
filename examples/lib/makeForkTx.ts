import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    Address,
    Hex,
    TestActions,
} from 'viem';

import { CHAINS, PublicWalletClient } from '../../src';
import {
    forkSetup,
    forkSetupCowAmm,
    sendTransactionGetBalances,
} from '../../test/lib/utils/helper';

type Tx = {
    to: Address;
    callData: Hex;
    value?: bigint | undefined;
};

type ForkToken = {
    address: Address;
    slot: number;
    rawBalance: bigint;
};

/**
 * Sets balances for forkTokens, send tx to Anvil fork and print pool token deltas for account
 */
export async function makeForkTx(
    tx: Tx,
    forkConfig: {
        rpcUrl: string;
        chainId: number;
        impersonateAccount: Address;
        forkTokens: ForkToken[];
        client?: PublicWalletClient & TestActions;
    },
    tokensForBalanceCheck: Address[],
    protocolVersion: 1 | 2 | 3,
    approveOnPermit2 = true,
) {
    const client =
        forkConfig.client ??
        createTestClient({
            mode: 'anvil',
            chain: CHAINS[forkConfig.chainId],
            transport: http(forkConfig.rpcUrl),
            account: forkConfig.impersonateAccount,
        })
            .extend(publicActions)
            .extend(walletActions);

    if (protocolVersion === 1) {
        await forkSetupCowAmm(
            client,
            forkConfig.impersonateAccount,
            forkConfig.forkTokens.map((t) => t.address),
            forkConfig.forkTokens.map((t) => t.slot),
            forkConfig.forkTokens.map((t) => t.rawBalance),
            tx.to,
        );
    } else {
        await forkSetup(
            client,
            forkConfig.impersonateAccount,
            forkConfig.forkTokens.map((t) => t.address),
            forkConfig.forkTokens.map((t) => t.slot),
            forkConfig.forkTokens.map((t) => t.rawBalance),
            undefined,
            protocolVersion,
            approveOnPermit2,
        );
    }

    console.log('\nSending tx...');
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokensForBalanceCheck,
            client,
            forkConfig.impersonateAccount,
            tx.to,
            tx.callData,
            tx.value,
        );
    if (transactionReceipt.status === 'reverted')
        throw Error('Transaction reverted');

    console.log('Token balance deltas:');
    console.log(tokensForBalanceCheck);
    console.log(balanceDeltas);
}
