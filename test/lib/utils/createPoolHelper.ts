import { CreatePoolTxInput } from './types';
import { Address, PoolType } from '../../../src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { weightedPoolFactoryV4Abi_V2 } from '../../../src/abi/weightedPoolFactoryV4.V2';
import { composableStableFactoryV5Abi_V2 } from '../../../src/abi/composableStableFactoryV5.V2';
import { weightedPoolFactoryAbi_V3 } from '@/abi/weightedPoolFactory.V3';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPool, createPoolInput, testAddress } = txInput;

    const { call, to } = createPool.buildCall(createPoolInput);

    const abis = {
        2: {
            [PoolType.Weighted]: weightedPoolFactoryV4Abi_V2,
            [PoolType.ComposableStable]: composableStableFactoryV5Abi_V2,
        },
        3: {
            [PoolType.Weighted]: weightedPoolFactoryAbi_V3,
        },
    };

    const hash = await client.sendTransaction({
        to,
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
        abi: abis[createPoolInput.balancerVersion][createPoolInput.poolType],
        to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    return poolAddress;
}
