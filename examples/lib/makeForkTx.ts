import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    Address,
    Hex,
} from 'viem';

import { CHAINS } from '../../src';
import {
    forkSetup,
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
    },
    tokensForBalanceCheck: Address[],
    vaultVersion: 2 | 3,
) {
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[forkConfig.chainId],
        transport: http(forkConfig.rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    await forkSetup(
        client,
        forkConfig.impersonateAccount,
        forkConfig.forkTokens.map((t) => t.address),
        forkConfig.forkTokens.map((t) => t.slot),
        forkConfig.forkTokens.map((t) => t.rawBalance),
        undefined,
        vaultVersion,
    );

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
