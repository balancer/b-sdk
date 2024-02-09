import dotenv from 'dotenv';
dotenv.config();

import { CreatePool, CreatePoolV3WeightedInput } from '@/entities';
import { PoolType, TokenType } from '@/types';
import {
    ChainId,
    CHAINS,
    WEIGHTED_POOL_FACTORY_BALANCER_V2,
    WEIGHTED_POOL_FACTORY_BALANCER_V3,
} from '@/utils';
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
import { weightedPoolFactoryV3Abi } from '@/abi/weightedPoolFactory.V3';

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
                tokenAddress: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                tokenAddress: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ],
        balancerVersion: 3,
    };
    const { call } = createPool.buildCall(createWeightedPoolInput);
    const hash = await client.sendTransaction({
        to: WEIGHTED_POOL_FACTORY_BALANCER_V3[chainId],
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
        abi: weightedPoolFactoryV3Abi,
        to: WEIGHTED_POOL_FACTORY_BALANCER_V3[chainId],
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    console.log('Created pool Address: ', poolAddress);
    return poolAddress;
};

export default createPool;
