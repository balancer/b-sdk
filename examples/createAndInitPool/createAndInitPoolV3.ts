/**
 * Quick script to deploy partially boosted pool we need for testing
 *
 * Run with:
 * pnpm example ./examples/createAndInitPool/createAndInitPoolV3.ts
 */

import { config } from 'dotenv';
config();

import {
    // createTestClient,
    http,
    publicActions,
    // walletActions,
    zeroAddress,
    parseUnits,
    createWalletClient,
    getContract,
    PrivateKeyAccount,
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
    InitPoolInput,
    TokenType,
    PERMIT2,
    BALANCER_ROUTER,
    permit2Abi,
    erc20Abi,
    MaxAllowanceExpiration,
    PermitDetails,
    Permit2Batch,
    MaxSigDeadline,
    AllowanceTransfer,
    balancerRouterAbi,
    PublicWalletClient,
} from 'src';
// import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
// import { makeForkTx } from 'examples/lib/makeForkTx';
// import { getSlot } from 'examples/lib/getSlot';

const SWAP_FEE_PERCENTAGE_DECIMALS = 16;
const AAVE_FAUCET_USDT = {
    address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as `0x${string}`,
    decimals: 6,
};
const STATA_ETH_DAI = {
    address: '0xDE46e43F46ff74A23a65EBb0580cbe3dFE684a17' as `0x${string}`,
    rateProvider: '0x22db61f3a8d81d3d427a157fdae8c7eb5b5fd373' as `0x${string}`,
    decimals: 18,
};

async function runAgainstFork() {
    // User defined inputs
    // const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = ChainId.SEPOLIA;

    const userAccount = privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}`,
    );

    // Use this client to submit txs to live network
    const client = createWalletClient({
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
        account: userAccount,
    }).extend(publicActions);

    // Use this client to run against a local fork
    // const client = createTestClient({
    //     mode: 'anvil',
    //     chain: CHAINS[chainId],
    //     transport: http(rpcUrl),
    // })
    //     .extend(publicActions)
    //     .extend(walletActions);

    const createPoolInput: CreatePoolV3StableInput = {
        name: 'USDT stataDAI partially boosted',
        symbol: 'USDT-stataDAI',
        poolType: PoolType.Stable,
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
        swapFeePercentage: parseUnits('0.001', SWAP_FEE_PERCENTAGE_DECIMALS),
        pauseManager: zeroAddress,
        swapFeeManager: zeroAddress,
        poolHooksContract: zeroAddress,
        enableDonation: false,
        disableUnbalancedLiquidity: false,
        protocolVersion: 3,
        chainId,
    };
    const initAmounts = [
        {
            address: AAVE_FAUCET_USDT.address,
            rawAmount: parseUnits('10', AAVE_FAUCET_USDT.decimals),
            decimals: AAVE_FAUCET_USDT.decimals,
        },
        {
            address: STATA_ETH_DAI.address,
            rawAmount: parseUnits('10', STATA_ETH_DAI.decimals),
            decimals: STATA_ETH_DAI.decimals,
        },
    ];

    // Build the create pool call using the SDK
    const call = await createPoolCall(createPoolInput);

    // Submit the create pool tx and wait for the PoolCreated event to find pool address
    const poolAddress = await createPool({ client, call, userAccount });
    console.log('Created Pool Address: ', poolAddress);

    // Approve permit2 contract to spend tokens used for init
    for (const token of initAmounts) {
        const tokenContract = getContract({
            address: token.address,
            abi: erc20Abi,
            client,
        });
        await tokenContract.write.approve([PERMIT2[chainId], token.rawAmount]);
    }

    // Build the init pool call using the SDK
    const initCall = await initPool({
        chainId,
        rpcUrl,
        userAccount,
        poolAddress,
        initAmounts,
    });

    // Set up batch and sig for permit2
    const { batch, signature } = await createPermit2({
        client,
        userAccount,
        initAmounts,
        chainId,
    });

    // Init the pool with permitBatchAndCall
    const router = getContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        client,
    });
    const args = [[], [], batch, signature, [initCall.callData]] as const;
    const hash = await router.write.permitBatchAndCall(args);
    console.log('hash', hash);

    // Make the tx against the local fork and print the result
    // await makeForkTx(
    //     initCall,
    //     {
    //         rpcUrl,
    //         chainId,
    //         impersonateAccount: userAccount.address,
    //         forkTokens: initAmounts.map((a) => ({
    //             address: a.address,
    //             slot: getSlot(chainId, a.address),
    //             rawBalance: a.rawAmount,
    //         })),
    //     },
    //     [...initAmounts.map((a) => a.address), poolAddress],
    //     createPoolInput.protocolVersion,
    // );
}

const createPoolCall = async (createPoolInput) => {
    const createPool = new CreatePool();
    const call = createPool.buildCall(createPoolInput);
    return call;
};

const initPool = async ({
    chainId,
    rpcUrl,
    userAccount,
    poolAddress,
    initAmounts,
}) => {
    const initPool = new InitPool();
    const poolType = PoolType.Stable;
    const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);

    const initPoolInput: InitPoolInput = {
        sender: userAccount,
        recipient: userAccount,
        amountsIn: initAmounts,
        chainId,
        minBptAmountOut: 0n,
    };

    const poolState = await initPoolDataProvider.getInitPoolData(
        poolAddress,
        poolType,
        3,
    );

    const call = initPool.buildCall(initPoolInput, poolState);
    console.log('init pool call', call);
    return call;
};

async function createPool({ client, call, userAccount }) {
    const hash = await client.sendTransaction({
        to: call.to,
        data: call.callData,
        account: userAccount,
    });
    const transactionReceipt = await client.waitForTransactionReceipt({
        hash,
    });

    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: stablePoolFactoryAbi_V3,
        to: call.to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    return poolAddress;
}

async function createPermit2({
    client,
    userAccount,
    initAmounts,
    chainId,
}: {
    client: PublicWalletClient;
    userAccount: PrivateKeyAccount;
    initAmounts: {
        address: `0x${string}`;
        rawAmount: bigint;
        decimals: number;
    }[];
    chainId: ChainId;
}) {
    const owner = userAccount.address;
    const permit2Contract = getContract({
        address: PERMIT2[chainId],
        abi: permit2Abi,
        client,
    });

    const details: PermitDetails[] = await Promise.all(
        initAmounts.map(async (token) => {
            const [, , nonce] = await permit2Contract.read.allowance([
                owner,
                token.address,
                BALANCER_ROUTER[chainId],
            ]);

            return {
                token: token.address,
                amount: token.rawAmount,
                expiration: Number(MaxAllowanceExpiration),
                nonce,
            };
        }),
    );

    const batch: Permit2Batch = {
        details,
        spender: BALANCER_ROUTER[chainId],
        sigDeadline: MaxSigDeadline,
    };

    const { domain, types, values } = AllowanceTransfer.getPermitData(
        batch,
        PERMIT2[chainId],
        chainId,
    );

    const signature = await client.signTypedData({
        account: userAccount,
        message: {
            ...values,
        },
        domain,
        primaryType: 'PermitBatch',
        types,
    });

    return { batch, signature };
}

export default runAgainstFork;
