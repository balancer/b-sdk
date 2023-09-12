import {
    Address,
    Client,
    PublicActions,
    TestActions,
    TransactionReceipt,
    WalletActions,
    concat,
    keccak256,
    pad,
    toBytes,
    toHex,
} from 'viem';
import { erc20Abi } from '../../../src/abi';
import { BALANCER_VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../src/utils';

export const approveToken = async (
    client: Client & PublicActions & WalletActions,
    account: Address,
    token: Address,
    amount = MAX_UINT256, // approve max by default
): Promise<boolean> => {
    // approve token on the vault
    const hash = await client.writeContract({
        account,
        chain: client.chain,
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [BALANCER_VAULT, amount],
    });

    const txReceipt = await client.getTransactionReceipt({
        hash,
    });
    return txReceipt.status === 'success';
};

export const getErc20Balance = (
    token: Address,
    client: Client & PublicActions,
    holder: Address,
): Promise<bigint> =>
    client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [holder],
    });

export const getBalances = async (
    tokens: Address[],
    client: Client & PublicActions,
    holder: Address,
): Promise<Promise<bigint[]>> => {
    const balances: Promise<bigint>[] = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === ZERO_ADDRESS) {
            balances[i] = client.getBalance({
                address: holder,
            });
        } else {
            balances[i] = getErc20Balance(tokens[i], client, holder);
        }
    }
    return Promise.all(balances);
};

export async function sendTransactionGetBalances(
    tokensForBalanceCheck: Address[],
    client: Client & PublicActions & TestActions & WalletActions,
    clientAddress: Address,
    to: Address,
    data: Address,
    value?: bigint,
): Promise<{
    transactionReceipt: TransactionReceipt;
    balanceDeltas: bigint[];
    gasUsed: bigint;
}> {
    const balanceBefore = await getBalances(
        tokensForBalanceCheck,
        client,
        clientAddress,
    );

    // Send transaction to local fork
    const hash = await client.sendTransaction({
        account: clientAddress,
        chain: client.chain,
        data,
        to,
        value,
    });
    const transactionReceipt = await client.getTransactionReceipt({
        hash,
    });
    const { gasUsed, effectiveGasPrice } = transactionReceipt;
    const gasPrice = gasUsed * effectiveGasPrice;

    const balancesAfter = await getBalances(
        tokensForBalanceCheck,
        client,
        clientAddress,
    );

    const balanceDeltas = balancesAfter.map((balanceAfter, i) => {
        let _balanceAfter = balanceAfter;
        if (tokensForBalanceCheck[i] === ZERO_ADDRESS) {
            // ignore ETH delta from gas cost
            _balanceAfter = balanceAfter + gasPrice;
        }
        const delta = _balanceAfter - balanceBefore[i];
        return delta >= 0n ? delta : -delta;
    });

    return {
        transactionReceipt,
        balanceDeltas,
        gasUsed,
    };
}

/**
 * Set local ERC20 token balance for a given account address (used for testing)
 *
 * @param client client that will perform the setStorageAt call
 * @param accountAddress Account address that will have token balance set
 * @param token Token address which balance will be set
 * @param slot Slot memory that stores balance - use npm package `slot20` to identify which slot to provide
 * @param balance Balance in EVM amount
 * @param isVyperMapping Whether the storage uses Vyper or Solidity mapping
 */
export const setTokenBalance = async (
    client: Client & TestActions,
    accountAddress: Address,
    token: Address,
    slot: number,
    balance: bigint,
    isVyperMapping = false,
): Promise<void> => {
    // Get storage slot index

    const slotBytes = pad(toBytes(slot));
    const accountAddressBytes = pad(toBytes(accountAddress));

    let index;
    if (isVyperMapping) {
        index = keccak256(concat([slotBytes, accountAddressBytes])); // slot, key
    } else {
        index = keccak256(concat([accountAddressBytes, slotBytes])); // key, slot
    }

    // Manipulate local balance (needs to be bytes32 string)
    await client.setStorageAt({
        address: token,
        index,
        value: toHex(balance, { size: 32 }),
    });
};
