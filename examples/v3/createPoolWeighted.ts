import dotenv from 'dotenv';
dotenv.config();

import {
    CreatePool,
    CreatePoolV3WeightedInput,
    weightedPoolFactoryAbi_V3,
    PoolType,
    TokenType,
    ChainId,
    CHAINS,
} from 'src';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    parseEther,
    zeroAddress,
} from 'viem';
import { TOKENS } from 'test/lib/utils/addresses';

const createPool = async () => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const chainId = ChainId.SEPOLIA;

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const signerAddress = (await client.getAddresses())[0];
    const createPool = new CreatePool();
    const createWeightedPoolInput: CreatePoolV3WeightedInput = {
        name: 'Test Pool',
        poolType: PoolType.Weighted,
        symbol: '50BAL-50WETH',
        tokens: [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ],
        balancerVersion: 3,
        chainId,
    };
    const { call, to } = createPool.buildCall(createWeightedPoolInput);
    const hash = await client.sendTransaction({
        to,
        data: call,
        account: signerAddress,
        chain: client.chain,
    });
    const transactionReceipt = await client.waitForTransactionReceipt({
        hash,
    });

    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: weightedPoolFactoryAbi_V3,
        to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    console.log('Created pool Address: ', poolAddress);
    return poolAddress;
};

export default createPool;
