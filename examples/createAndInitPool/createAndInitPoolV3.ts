/**
 * Example script to create and init a v3 pool
 *
 * Change the default export to runAgainstFork or runAgainstNetwork
 *
 * Run with:
 * pnpm example ./examples/createAndInitPool/createAndInitPoolV3.ts
 */

import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
    parseUnits,
    createWalletClient,
    getContract,
    Address,
    parseEther,
    Account,
    erc20Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
    CreatePoolV3StableInput,
    CreatePool,
    PoolType,
    ChainId,
    CHAINS,
    InitPoolDataProvider,
    InitPool,
    InitPoolInputV3,
    TokenType,
    PERMIT2,
    Permit2Helper,
    PublicWalletClient,
    stablePoolFactoryAbiExtended,
} from 'src';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { approveSpenderOnTokens } from 'test/lib/utils/helper';
import { TOKENS } from 'test/lib/utils/addresses';

// Create pool config
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.Stable;
const protocolVersion = 3;
const DAI = TOKENS[chainId].DAI;
const USDC = TOKENS[chainId].USDC;
const createPoolInput: CreatePoolV3StableInput = {
    poolType: PoolType.Stable,
    name: 'DAI/USDC Stable Pool',
    symbol: 'DAI-USDC',
    tokens: [
        {
            address: DAI.address,
            rateProvider: zeroAddress,
            tokenType: TokenType.STANDARD,
            paysYieldFees: false,
        },
        {
            address: USDC.address,
            rateProvider: zeroAddress,
            tokenType: TokenType.STANDARD,
            paysYieldFees: false,
        },
    ],
    amplificationParameter: 420n, // min 1n to max 5000n
    swapFeePercentage: parseEther('0.001'), // stable pools allow min 1e12 to max 10e16
    poolHooksContract: zeroAddress,
    pauseManager: zeroAddress,
    swapFeeManager: zeroAddress,
    chainId,
    protocolVersion: 3,
    enableDonation: false,
    disableUnbalancedLiquidity: false,
};

// Init pool config
const amountsIn = [
    {
        address: DAI.address,
        rawAmount: parseUnits('1', DAI.decimals),
        decimals: DAI.decimals,
    },
    {
        address: USDC.address,
        rawAmount: parseUnits('1', USDC.decimals),
        decimals: USDC.decimals,
    },
];
const initPoolInput: InitPoolInputV3 = {
    chainId,
    amountsIn: amountsIn,
    minBptAmountOut: 0n,
};

export default async function runAgainstFork() {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const account = (await client.getAddresses())[0];

    // Create the pool and parse the tx receipt to get the pool address
    const poolAddress = await createPool({ client, account });

    // Approve the canonical permit2 contract to spend tokens that will be used for pool init
    await approveSpenderOnTokens(
        client,
        account,
        amountsIn.map((t) => t.address),
        PERMIT2[chainId],
    );

    // Build the init pool call
    const initPoolCall = await buildInitPoolCall({
        client,
        rpcUrl,
        account,
        poolAddress,
    });

    // Send the init pool tx to local anvil fork
    await makeForkTx(
        initPoolCall,
        {
            rpcUrl,
            chainId,
            impersonateAccount: account,
            forkTokens: amountsIn.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
        },
        [...amountsIn.map((a) => a.address), poolAddress],
        createPoolInput.protocolVersion,
    );
}

export async function runAgainstNetwork() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error('rpcUrl is undefined');

    const client = createWalletClient({
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
        account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
    }).extend(publicActions);

    const { account } = client;

    // Create the pool and parse the tx receipt to get the pool address
    const poolAddress = await createPool({ client, account });

    // Approve the canonical permit2 contract to spend tokens that will be used for pool init
    for (const token of amountsIn) {
        const tokenContract = getContract({
            address: token.address,
            abi: erc20Abi,
            client,
        });
        await tokenContract.write.approve([PERMIT2[chainId], token.rawAmount]);
    }

    // Build the init pool call
    const initPoolCall = await buildInitPoolCall({
        client,
        rpcUrl,
        account: account,
        poolAddress,
    });

    // Send the init pool tx
    const initPoolTxHash = await client.sendTransaction({
        account,
        data: initPoolCall.callData,
        to: initPoolCall.to,
        value: initPoolCall.value,
    });
    const initPoolTxReceipt = await client.waitForTransactionReceipt({
        hash: initPoolTxHash,
    });
    console.log('initPoolTxReceipt', initPoolTxReceipt);
}

async function createPool({ client, account }): Promise<Address> {
    // Build the create pool call
    const createPool = new CreatePool();
    const call = createPool.buildCall(createPoolInput);
    console.log('create pool call:', call);

    // Send the create pool tx
    const hash = await client.sendTransaction({
        to: call.to,
        data: call.callData,
        account,
    });

    const transactionReceipt = await client.waitForTransactionReceipt({ hash });

    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: stablePoolFactoryAbiExtended,
        to: call.to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    console.log('Pool created at address: ', poolAddress);

    return poolAddress;
}

async function buildInitPoolCall({
    client,
    rpcUrl,
    account,
    poolAddress,
}: {
    client: PublicWalletClient;
    rpcUrl: string;
    account: Address | Account;
    poolAddress: Address;
}) {
    // Fetch the necessary pool state
    const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
    const poolState = await initPoolDataProvider.getInitPoolData(
        poolAddress,
        poolType,
        protocolVersion,
    );

    // Sign permit2 approval
    const permit2 = await Permit2Helper.signInitPoolApproval({
        ...initPoolInput,
        client,
        owner: account,
    });

    // Build the init pool call
    const initPool = new InitPool();
    const call = initPool.buildCallWithPermit2(
        initPoolInput,
        poolState,
        permit2,
    );
    console.log('init pool call:', call);

    return call;
}
