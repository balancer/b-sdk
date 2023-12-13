import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import { CreatePool } from '../src/entities/createPool/createPool';
import {
    ANVIL_NETWORKS,
    startFork,
    stopAnvilForks,
} from '../test/anvil/anvil-global-setup';
import { CHAINS, ChainId, WEIGHTED_POOL_FACTORY } from '../src';
import { findEventInReceiptLogs } from '../test/lib/utils/findEventInReceiptLogs';
import { weightedFactoryV4Abi } from '../src/abi/weightedFactoryV4';
import { CreatePoolWeightedInput } from '../src/entities/createPool/types';

const createPool = async (stopForkAfterExecution = true) => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const signerAddress = (await client.getAddresses())[0];
    const createPool = new CreatePool();
    const poolType = 'WEIGHTED';
    const createWeightedPoolInput: CreatePoolWeightedInput = {
        name: 'Test Pool',
        symbol: '50BAL-25WETH-25DAI',
        tokens: [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 2}`).toString(),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 4}`).toString(),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 4}`).toString(),
                rateProvider: zeroAddress,
            },
        ],
        swapFee: '0.01',
        poolOwnerAddress: signerAddress, // Balancer DAO Multisig
    };
    const { call } = createPool.buildCall(poolType, createWeightedPoolInput);
    const hash = await client.sendTransaction({
        to: WEIGHTED_POOL_FACTORY[chainId],
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
        abi: weightedFactoryV4Abi,
        to: WEIGHTED_POOL_FACTORY[chainId],
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    console.log('Created pool Address: ', poolAddress);
    if (stopForkAfterExecution) {
        await stopAnvilForks();
    }
    return poolAddress;
};

createPool();
