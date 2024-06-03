import {
    Address,
    Client,
    Hex,
    PublicActions,
    TestActions,
    TransactionReceipt,
    WalletActions,
    concat,
    encodeAbiParameters,
    hexToBigInt,
    keccak256,
    maxUint160,
    maxUint48,
    pad,
    toBytes,
    toHex,
    trim,
} from 'viem';

import { erc20Abi, permit2Abi } from '@/abi';
import {
    VAULT,
    MAX_UINT256,
    ZERO_ADDRESS,
    PERMIT2,
    BALANCER_ROUTER,
    BALANCER_BATCH_ROUTER,
} from '@/utils';

export type TxOutput = {
    transactionReceipt: TransactionReceipt;
    balanceDeltas: bigint[];
    gasUsed: bigint;
};

export const hasApprovedToken = async (
    client: Client & PublicActions & WalletActions,
    account: Address,
    token: Address,
    spender: Address,
    amount = MAX_UINT256,
): Promise<boolean> => {
    const allowance = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account, spender],
    });

    const hasApproved = allowance >= amount;
    return hasApproved;
};

export const hasApprovedTokenOnPermit2 = async (
    client: Client & PublicActions & WalletActions,
    account: Address,
    token: Address,
    spender: Address,
    amount = maxUint160,
): Promise<boolean> => {
    const chainId = await client.getChainId();
    const [allowance, ,] = await client.readContract({
        address: PERMIT2[chainId],
        abi: permit2Abi,
        functionName: 'allowance',
        args: [account, token, spender],
    });

    const hasApproved = allowance >= amount;
    return hasApproved;
};

export const approveToken = async (
    client: Client & PublicActions & WalletActions,
    accountAddress: Address,
    tokenAddress: Address,
    vaultVersion: 2 | 3,
    amount?: bigint,
    deadline?: bigint,
): Promise<boolean> => {
    const chainId = await client.getChainId();

    let approved = false;
    if (vaultVersion === 2) {
        // Approve Vault V2 to spend account tokens
        approved = await approveSpenderOnToken(
            client,
            accountAddress,
            tokenAddress,
            VAULT[chainId],
            amount,
        );
    } else {
        // Approve Permit2 to spend account tokens
        const approvedOnToken = await approveSpenderOnToken(
            client,
            accountAddress,
            tokenAddress,
            PERMIT2[chainId],
            amount,
        );
        // Approve Router to spend account tokens using Permit2
        const routerApprovedOnPermit2 = await approveSpenderOnPermit2(
            client,
            accountAddress,
            tokenAddress,
            BALANCER_ROUTER[chainId],
            amount,
            deadline,
        );
        // Approve BatchRouter to spend account tokens using Permit2
        const batchRouterApprovedOnPermit2 = await approveSpenderOnPermit2(
            client,
            accountAddress,
            tokenAddress,
            BALANCER_BATCH_ROUTER[chainId],
            amount,
            deadline,
        );
        approved =
            approvedOnToken &&
            routerApprovedOnPermit2 &&
            batchRouterApprovedOnPermit2;
    }
    return approved;
};

export const approveSpenderOnToken = async (
    client: Client & PublicActions & WalletActions,
    account: Address,
    token: Address,
    spender: Address,
    amount = MAX_UINT256, // approve max by default
): Promise<boolean> => {
    // approve token on the vault
    await client.writeContract({
        account,
        chain: client.chain,
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
    });

    const approved = await hasApprovedToken(
        client,
        account,
        token,
        spender,
        amount,
    );
    return approved;
};

export const approveSpenderOnPermit2 = async (
    client: Client & PublicActions & WalletActions,
    account: Address,
    token: Address,
    spender: Address,
    amount = maxUint160, // approve max by default
    deadline = maxUint48, // approve max by default
): Promise<boolean> => {
    const chainId = await client.getChainId();
    await client.writeContract({
        account,
        chain: client.chain,
        address: PERMIT2[chainId],
        abi: permit2Abi,
        functionName: 'approve',
        args: [token, spender, amount, Number(deadline)],
    });

    const approved = await hasApprovedTokenOnPermit2(
        client,
        account,
        token,
        spender,
        amount,
    );
    return approved;
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

/**
 * Helper function that sends a transaction and calculates balance changes
 *
 * @param tokensForBalanceCheck Token addresses to check balance deltas
 * @param client Client that will perform transactions
 * @param clientAddress Account address that will have token balance checked
 * @param to Contract Address that will be called
 * @param data Transaction encoded data
 * @param value ETH value in case of ETH transfer
 * @returns Transaction recepit, balance deltas and gas used
 */
export async function sendTransactionGetBalances(
    tokensForBalanceCheck: Address[],
    client: Client & PublicActions & TestActions & WalletActions,
    clientAddress: Address,
    to: Address,
    data: Address,
    value?: bigint,
): Promise<TxOutput> {
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

    const transactionReceipt = (await client.waitForTransactionReceipt({
        hash,
    })) as TransactionReceipt;

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

    let index: Address;
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

/**
 * Find ERC20 token balance storage slot (to be used on setTokenBalance)
 *
 * @param client client that will perform contract calls
 * @param accountAddress Account address to probe storage slot changes
 * @param tokenAddress Token address which we're looking for the balance slot
 * @param isVyperMapping Whether the storage uses Vyper or Solidity mapping
 */
export async function findTokenBalanceSlot(
    client: Client & PublicActions & TestActions,
    accountAddress: Address,
    tokenAddress: Address,
    isVyperMapping = false,
): Promise<number> {
    const probeA = encodeAbiParameters(
        [{ name: 'probeA', type: 'uint256' }],
        [BigInt((Math.random() * 10000).toFixed())],
    );
    const probeB = encodeAbiParameters(
        [{ name: 'probeA', type: 'uint256' }],
        [BigInt((Math.random() * 10000).toFixed())],
    );
    for (let i = 0; i < 999; i++) {
        // encode probed slot
        const slotBytes = pad(toBytes(i));
        const accountAddressBytes = pad(toBytes(accountAddress));
        let probedSlot: Address;
        if (isVyperMapping) {
            probedSlot = keccak256(concat([slotBytes, accountAddressBytes])); // slot, key
        } else {
            probedSlot = keccak256(concat([accountAddressBytes, slotBytes])); // key, slot
        }

        // remove padding for JSON RPC
        probedSlot = trim(probedSlot);

        // get storage value
        const prev = (await client.getStorageAt({
            address: tokenAddress,
            slot: probedSlot,
        })) as Hex;

        // set storage slot to new probe
        const probe = prev === probeA ? probeB : probeA;
        await client.setStorageAt({
            address: tokenAddress,
            index: probedSlot,
            value: probe,
        });

        // check if balance changed
        const balance = await getErc20Balance(
            tokenAddress,
            client,
            accountAddress,
        );

        // reset to previous value
        await client.setStorageAt({
            address: tokenAddress,
            index: probedSlot,
            value: prev,
        });

        // return slot if balance changed
        if (balance === hexToBigInt(probe)) return i;
    }
    throw new Error('Balance slot not found!');
}

/**
 * Setup local fork with approved token balance for a given account address
 *
 * @param client Client that will perform transactions
 * @param accountAddress Account address that will have token balance set and approved
 * @param tokens Token addresses which balance will be set and approved
 * @param slots Slot that stores token balance in memory - use npm package `slot20` to identify which slot to provide
 * @param balances Balances in EVM amounts
 * @param jsonRpcUrl Url with remote node to be forked locally
 * @param isVyperMapping Whether the storage uses Vyper or Solidity mapping
 */
export const forkSetup = async (
    client: Client & PublicActions & TestActions & WalletActions,
    accountAddress: Address,
    tokens: Address[],
    slots: number[] | undefined,
    balances: bigint[],
    isVyperMapping: boolean[] = Array(tokens.length).fill(false),
    vaultVersion: 2 | 3 = 2,
): Promise<void> => {
    await client.impersonateAccount({ address: accountAddress });

    let _slots: number[];
    if (
        slots?.every((slot) => slot !== undefined) &&
        slots.length === tokens.length
    ) {
        _slots = slots;
    } else {
        _slots = await Promise.all(
            tokens.map(async (token, i) =>
                findTokenBalanceSlot(
                    client,
                    accountAddress,
                    token,
                    isVyperMapping[i],
                ),
            ),
        );
        console.log(`slots: ${_slots}`);
    }

    for (let i = 0; i < tokens.length; i++) {
        // Set initial account balance for each token that will be used to add
        // liquidity to the pool
        await setTokenBalance(
            client,
            accountAddress,
            tokens[i],
            _slots[i],
            balances[i],
            isVyperMapping[i],
        );

        await approveToken(client, accountAddress, tokens[i], vaultVersion);
    }
};
