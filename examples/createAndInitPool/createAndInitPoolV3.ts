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
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
    stablePoolFactoryAbi_V3,
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
    erc20Abi,
    Permit2Helper,
    PublicWalletClient,
} from 'src';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { approveSpenderOnTokens } from 'test/lib/utils/helper';

// Create pool config
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.Stable;
const protocolVersion = 3;
const swapFeePercentageDecimals = 16;
const AAVE_FAUCET_USDT = {
    address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as `0x${string}`,
    decimals: 6,
};
const STATA_ETH_DAI = {
    address: '0xDE46e43F46ff74A23a65EBb0580cbe3dFE684a17' as `0x${string}`,
    rateProvider: '0x22db61f3a8d81d3d427a157fdae8c7eb5b5fd373' as `0x${string}`,
    decimals: 18,
};
const createPoolInput: CreatePoolV3StableInput = {
    name: 'USDT stataDAI partially boosted',
    symbol: 'USDT-stataDAI',
    poolType,
    tokens: [
        {
            address: AAVE_FAUCET_USDT.address,
            rateProvider: zeroAddress,
            tokenType: TokenType.STANDARD,
            paysYieldFees: false,
        },
        {
            address: STATA_ETH_DAI.address,
            rateProvider: STATA_ETH_DAI.rateProvider,
            tokenType: TokenType.TOKEN_WITH_RATE,
            paysYieldFees: true,
        },
    ],
    amplificationParameter: BigInt(33),
    swapFeePercentage: parseUnits('0.001', swapFeePercentageDecimals),
    pauseManager: zeroAddress,
    swapFeeManager: zeroAddress,
    poolHooksContract: zeroAddress,
    enableDonation: false,
    disableUnbalancedLiquidity: false,
    protocolVersion,
    chainId,
};

// Init pool config
const amountsIn = [
    {
        address: AAVE_FAUCET_USDT.address,
        rawAmount: parseUnits('1', AAVE_FAUCET_USDT.decimals),
        decimals: AAVE_FAUCET_USDT.decimals,
    },
    {
        address: STATA_ETH_DAI.address,
        rawAmount: parseUnits('1', STATA_ETH_DAI.decimals),
        decimals: STATA_ETH_DAI.decimals,
    },
];
const initPoolInput: InitPoolInputV3 = {
    amountsIn: amountsIn,
    chainId,
    minBptAmountOut: 0n,
};

export async function runAgainstFork() {
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
    })
        .extend(walletActions)
        .extend(publicActions);

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
        account: account.address,
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
        abi: stablePoolFactoryAbi_V3,
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
    account: Address;
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
