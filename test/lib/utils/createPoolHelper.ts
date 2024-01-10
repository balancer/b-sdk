import { CreatePoolTxInput } from './types';
import {
    Address,
    COMPOSABLE_STABLE_POOL_FACTORY,
    PoolType,
    WEIGHTED_POOL_FACTORY,
} from '../../../src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { weightedFactoryV4Abi } from '../../../src/abi/weightedFactoryV4';
import { composableStableFactoryV5Abi } from '../../../src/abi/composableStableFactoryV5';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPool, createPoolInput, testAddress } = txInput;

    const { call } = createPool.buildCall(createPoolInput);
    const chainId = await client.getChainId();

    const factories = {
        [PoolType.Weighted]: {
            address: WEIGHTED_POOL_FACTORY[chainId],
            abi: weightedFactoryV4Abi,
        },
        [PoolType.ComposableStable]: {
            address: COMPOSABLE_STABLE_POOL_FACTORY[chainId],
            abi: composableStableFactoryV5Abi,
        },
    };

    const hash = await client.sendTransaction({
        to: factories[createPoolInput.poolType].address,
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
        abi: factories[createPoolInput.poolType].abi,
        to: factories[createPoolInput.poolType].address,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    return poolAddress;
}
