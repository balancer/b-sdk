import { CreatePoolTxInput } from './types';
import { Address, COMPOSABLE_STABLE_POOL_FACTORY, WEIGHTED_POOL_FACTORY } from '../../../src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { weightedFactoryV4Abi } from '../../../src/abi/weightedFactoryV4';
import { composableStableFactoryV5Abi } from '../../../src/abi/composableStableFactoryV5';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPool, createPoolInput, testAddress } = txInput;

    const { call } = createPool.buildCreatePoolCall(
        txInput.poolType,
        createPoolInput,
    );
    const chainId = await client.getChainId();

    const factories = {
        WEIGHTED: {
            address: WEIGHTED_POOL_FACTORY[chainId],
            abi: weightedFactoryV4Abi,
        },
        PHANTOM_STABLE: {
            address: COMPOSABLE_STABLE_POOL_FACTORY[chainId],
            abi: composableStableFactoryV5Abi,
        },
    };

    const hash = await client.sendTransaction({
        to: factories[txInput.poolType].address,
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
        abi: factories[txInput.poolType].abi,
        to: factories[txInput.poolType].address,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    return poolAddress;
}
