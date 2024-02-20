import dotenv from 'dotenv';
dotenv.config();

import {
    CreatePool,
    CreatePoolV2WeightedInput,
    PoolType,
    ChainId,
    CHAINS,
    WEIGHTED_POOL_FACTORY_BALANCER_V2,
    weightedPoolFactoryV4Abi_V2,
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

const createPool = async () => {
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
    const poolType = PoolType.Weighted;
    const createWeightedPoolInput: CreatePoolV2WeightedInput = {
        name: 'Test Pool',
        symbol: '50BAL-25WETH-25DAI',
        poolType,
        tokens: [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
            },
        ],
        swapFee: '0.01',
        poolOwnerAddress: signerAddress, // Balancer DAO Multisig
        balancerVersion: 2,
    };
    const { call } = createPool.buildCall(createWeightedPoolInput);
    const hash = await client.sendTransaction({
        to: WEIGHTED_POOL_FACTORY_BALANCER_V2[chainId],
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
        abi: weightedPoolFactoryV4Abi_V2,
        to: WEIGHTED_POOL_FACTORY_BALANCER_V2[chainId],
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    console.log('Created pool Address: ', poolAddress);
    return poolAddress;
};

export default createPool;
