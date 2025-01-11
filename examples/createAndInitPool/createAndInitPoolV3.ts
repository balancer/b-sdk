/**
 * Quick script to deploy partially boosted pool we need for testing
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
    // createWalletClient,
    // getContract,
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
    // erc20Abi,
    Permit2Helper,
} from 'src';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { approveSpenderOnTokens } from 'test/lib/utils/helper';

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
    // Use this rpcUrl to run against a local fork
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);

    // Use this rpcUrl to run against a live network
    // const rpcUrl = process.env.SEPOLIA_RPC_URL;

    if (!rpcUrl) throw new Error('rpcUrl is undefined');

    const chainId = ChainId.SEPOLIA;

    const userAccount = privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}`,
    );

    // Use this client to run against a local fork
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    // Use this client to submit txs to live network
    // const client = createWalletClient({
    //     chain: CHAINS[chainId],
    //     transport: http(rpcUrl),
    //     account: userAccount,
    // }).extend(publicActions);

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

    // Helper to approve permit2 contract to spend tokens used for init
    await approveSpenderOnTokens(
        client,
        userAccount.address,
        initAmounts.map((t) => t.address),
        PERMIT2[chainId],
    );

    // Use this to approve permit2 contract on live network
    // for (const token of initAmounts) {
    //     const tokenContract = getContract({
    //         address: token.address,
    //         abi: erc20Abi,
    //         client,
    //     });
    //     await tokenContract.write.approve(PERMIT2[chainId], token.rawAmount);
    // }

    const initPool = new InitPool();
    const poolType = PoolType.Stable;
    const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);

    const initPoolInput: InitPoolInputV3 = {
        amountsIn: initAmounts,
        chainId,
        minBptAmountOut: 0n,
    };

    const poolState = await initPoolDataProvider.getInitPoolData(
        poolAddress,
        poolType,
        3,
    );
    const permit2 = await Permit2Helper.signInitPoolApproval({
        ...initPoolInput,
        client,
        owner: userAccount.address,
    });

    const initPoolCall = initPool.buildCallWithPermit2(
        initPoolInput,
        poolState,
        permit2,
    );
    console.log('init pool call', call);

    // Make the tx against the local fork and print the result
    await makeForkTx(
        initPoolCall,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount.address,
            forkTokens: initAmounts.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
        },
        [...initAmounts.map((a) => a.address), poolAddress],
        createPoolInput.protocolVersion,
    );

    // Send the tx to a live network
    // const txHash = await client.sendTransaction({
    //     to: initPoolCall.to,
    //     data: initPoolCall.callData,
    //     account: userAccount,
    // });
    // const txReceipt = await client.waitForTransactionReceipt({
    //     hash: txHash,
    // });
    // console.log('txReceipt', txReceipt);
}

const createPoolCall = async (createPoolInput) => {
    const createPool = new CreatePool();
    const call = createPool.buildCall(createPoolInput);
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

export default runAgainstFork;
