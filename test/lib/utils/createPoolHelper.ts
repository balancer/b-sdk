import { CreatePoolTxInput } from './types';
import {
    Address,
    COMPOSABLE_STABLE_POOL_FACTORY,
    PoolType,
    WEIGHTED_POOL_FACTORY_BALANCER_V2,
    WEIGHTED_POOL_FACTORY_BALANCER_V3,
} from '../../../src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { weightedPoolFactoryV2Abi } from '../../../src/abi/weightedPoolFactory.V2';
import { composableStableFactoryV2Abi } from '../../../src/abi/composableStableFactory.V2';
import { weightedPoolFactoryV3Abi } from '@/abi/weightedPoolFactory.V3';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPool, createPoolInput, testAddress } = txInput;

    const { call } = createPool.buildCall(createPoolInput);
    const chainId = await client.getChainId();

    const factories = {
        2: {
            [PoolType.Weighted]: {
                address: WEIGHTED_POOL_FACTORY_BALANCER_V2[chainId],
                abi: weightedPoolFactoryV2Abi,
            },
            [PoolType.ComposableStable]: {
                address: COMPOSABLE_STABLE_POOL_FACTORY[chainId],
                abi: composableStableFactoryV2Abi,
            },
        },
        3: {
            [PoolType.Weighted]: {
                address: WEIGHTED_POOL_FACTORY_BALANCER_V3[chainId],
                abi: weightedPoolFactoryV3Abi,
            },
        },
    };

    const hash = await client.sendTransaction({
        to: factories[createPoolInput.balancerVersion][createPoolInput.poolType]
            .address,
        data: call,
        account: testAddress,
        chain: client.chain,
    });

    const transactionReceipt = await client.waitForTransactionReceipt({
        hash,
    });
    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: factories[createPoolInput.balancerVersion][
            createPoolInput.poolType
        ].abi,
        to: factories[createPoolInput.balancerVersion][createPoolInput.poolType]
            .address,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    return poolAddress;
}
