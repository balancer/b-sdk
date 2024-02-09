import dotenv from 'dotenv';
dotenv.config();

import { composableStableFactoryV2Abi } from '@/abi/composableStableFactory.V2';
import { CreatePool, CreatePoolV2ComposableStableInput } from '@/entities';
import { PoolType } from '@/types';
import { ChainId, CHAINS, COMPOSABLE_STABLE_POOL_FACTORY } from '@/utils';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import {
    Address,
    Client,
    PublicActions,
    WalletActions,
    TestActions,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';

const createPoolComposableStable = async (): Promise<{
    poolAddress: Address;
    rpcUrl: string;
    client: Client & PublicActions & WalletActions & TestActions;
}> => {
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
    const poolType = PoolType.ComposableStable;
    const createPoolComposableStableInput: CreatePoolV2ComposableStableInput = {
        name: 'Test Pool',
        symbol: '50BAL-50WETH',
        poolType,
        tokens: [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
        ],
        amplificationParameter: BigInt(62),
        exemptFromYieldProtocolFeeFlag: false,
        swapFee: '0.01',
        poolOwnerAddress: signerAddress, // Balancer DAO Multisig,
        balancerVersion: 2,
    };
    const { call } = createPool.buildCall(createPoolComposableStableInput);
    const hash = await client.sendTransaction({
        to: COMPOSABLE_STABLE_POOL_FACTORY[chainId],
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
        abi: composableStableFactoryV2Abi,
        to: COMPOSABLE_STABLE_POOL_FACTORY[chainId],
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    console.log('Created Pool Address: ', poolAddress);

    return { poolAddress, rpcUrl, client };
};

export default createPoolComposableStable;