/**
 * Example showing how to create and initialise a V2 ComposableStable pool.
 * (Runs against a local Anvil fork)
 * Note
 * - other pool types, e.g. Weighted, can be created using the relative pool types.
 * - V3 creation is also possible by updating vaultVersion
 *
 * Run with:
 * pnpm example ./examples/createAndInitPool/createAndInitPool.ts
 */
import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
    parseEther,
} from 'viem';
import {
    composableStableFactoryV5Abi_V2,
    CreatePool,
    CreatePoolV2ComposableStableInput,
    PoolType,
    ChainId,
    CHAINS,
    InitPoolDataProvider,
    InitPool,
    InitPoolInput,
} from 'src';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const userAccount = (await client.getAddresses())[0];
    const createPoolInput: CreatePoolV2ComposableStableInput = {
        name: 'Test Pool',
        symbol: '50BAL-50WETH',
        poolType: PoolType.ComposableStable,
        tokens: [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
        ],
        amplificationParameter: BigInt(62),
        exemptFromYieldProtocolFeeFlag: false,
        swapFee: '0.01',
        poolOwnerAddress: userAccount,
        vaultVersion: 2, // For V3 creation change to 3
        chainId,
    };
    const initAmounts = createPoolInput.tokens.map((t) => {
        return {
            address: t.address,
            rawAmount: parseEther('100'),
            decimals: 18,
        };
    });

    // Builds the create pool call using the SDK
    const call = await createPoolCall(createPoolInput);

    // Submit the create pool tx and wait for the PoolCreated event to find pool address
    const poolAddress = await createPool({ client, call, userAccount });
    console.log('Created Pool Address: ', poolAddress);

    // Build the init pool call using the SDK
    const initCall = await initPool({
        chainId,
        rpcUrl,
        userAccount,
        poolAddress,
        initAmounts,
    });

    // Make the tx against the local fork and print the result
    await makeForkTx(
        initCall,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: initAmounts.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
        },
        [...initAmounts.map((a) => a.address), poolAddress],
        createPoolInput.vaultVersion,
    );
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
    const poolType = PoolType.ComposableStable;
    const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);

    const initPoolInput: InitPoolInput = {
        sender: userAccount,
        recipient: userAccount,
        amountsIn: initAmounts,
        chainId,
    };
    const poolState = await initPoolDataProvider.getInitPoolData(
        poolAddress,
        poolType,
        2,
    );

    const call = await initPool.buildCall(initPoolInput, poolState);
    return call;
};

async function createPool({ client, call, userAccount }) {
    const hash = await client.sendTransaction({
        to: call.to,
        data: call.call,
        chain: client.chain,
        account: userAccount,
    });
    const transactionReceipt = await client.waitForTransactionReceipt({
        hash,
    });

    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: composableStableFactoryV5Abi_V2,
        to: call.to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    return poolAddress;
}

export default runAgainstFork;
