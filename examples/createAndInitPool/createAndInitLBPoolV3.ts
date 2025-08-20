/**
 * Example script to create and init a v3 LBPool
 *
 * Change the default export to runAgainstFork or runAgainstNetwork
 *
 * Run with:
 * pnpm example ./examples/createAndInitPool/createAndInitLBPoolV3.ts
 */

import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    parseUnits,
    createWalletClient,
    getContract,
    Address,
    Account,
    erc20Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
    ChainId,
    PoolType,
    CreatePoolLiquidityBootstrappingInput,
    lBPoolFactoryAbi_V3,
    LBPParams,
    InitPoolInputV3,
    InitPoolDataProvider,
    InitPool,
    CHAINS,
    PERMIT2,
    Permit2Helper,
    PublicWalletClient,
    CreatePool,
} from 'src';

import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { approveSpenderOnTokens } from 'test/lib/utils/helper';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';

// Create pool config
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.LiquidityBootstrapping;
const protocolVersion = 3;

// replace with the tokens you want to create the pool with
const collateralToken = {
    address: '0xB77EB1A70A96fDAAeB31DB1b42F2b8b5846b2613' as Address, // DAI address
    decimals: 18,
};
const projectToken = {
    address: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75' as Address, // BAL address
    decimals: 18,
};

const lbpOwner = '0x0c06B6D4EC451987e8C0B772ffcf7F080c46447A'; // replace with the owner address for the LBP

const lbpParams: LBPParams = {
    owner: lbpOwner,
    projectToken: projectToken.address,
    reserveToken: collateralToken.address,
    projectTokenStartWeight: BigInt(0.5 * 1e18), // 50%
    reserveTokenStartWeight: BigInt(0.5 * 1e18), // 50%
    projectTokenEndWeight: BigInt(0.1 * 1e18), // 10%
    reserveTokenEndWeight: BigInt(0.9 * 1e18), // 90%
    startTime: BigInt(Math.floor(Date.now() / 1000)) + BigInt(5 * 60), // start in 5 minutes
    endTime: BigInt(Math.floor(Date.now() / 1000)) + BigInt(60 * 60), // end in 1 hour
    blockProjectTokenSwapsIn: false, // don't block project token swaps in
};

const createPoolInput: CreatePoolLiquidityBootstrappingInput = {
    poolType: PoolType.LiquidityBootstrapping,
    lbpParams: lbpParams,
    symbol: 'shortLBP',
    chainId: chainId,
    protocolVersion: protocolVersion,
    swapFeePercentage: BigInt(0.003 * 1e18), // 0.3% swap fee
};

// init pool config
const amountsIn = [
    {
        address: projectToken.address,
        rawAmount: parseUnits('1', projectToken.decimals),
        decimals: projectToken.decimals,
    },
    {
        address: collateralToken.address,
        rawAmount: parseUnits('1', collateralToken.decimals),
        decimals: collateralToken.decimals,
    },
];
const initPoolInput: InitPoolInputV3 = {
    chainId,
    amountsIn: amountsIn,
    minBptAmountOut: 0n,
};

export async function runAgainstFork() {
    const { rpcUrl } = await startFork(
        ANVIL_NETWORKS.SEPOLIA,
        undefined,
        7832604n,
    );

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const account = (await client.getAddresses())[0];

    // lbpParams.owner = account as Address;
    // The LBPool checks if the owner is the initializer
    createPoolInput.lbpParams.owner = account as Address;

    // Create the pool and parse the tx receipt to get the pool address
    const poolAddress = await createPool({ client, account });

    // Approve the cannonical permit2 contract to spend tokens that will be used for pool init
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

export default async function runAgainstNetwork() {
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

    // Approve the cannonical permit2 contract to spend tokens that will be used for pool init
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
        abi: lBPoolFactoryAbi_V3,
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
