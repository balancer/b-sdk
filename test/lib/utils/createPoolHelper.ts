import { CreatePoolTxInput } from './types';
import {
    Address,
    PoolType,
    weightedPoolFactoryV4Abi_V2,
    composableStableFactoryV6Abi_V2,
    weightedPoolFactoryAbi_V3,
    stablePoolFactoryAbi_V3,
} from 'src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { CreatePool } from 'src';
import { stableSurgeFactoryAbi } from '@/abi/stableSurgeFactory';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPoolInput, testAddress } = txInput;

    const createPool = new CreatePool();
    const { callData, to } = createPool.buildCall(createPoolInput);

    const abis = {
        2: {
            [PoolType.Weighted]: weightedPoolFactoryV4Abi_V2,
            [PoolType.ComposableStable]: composableStableFactoryV6Abi_V2,
        },
        3: {
            [PoolType.Weighted]: weightedPoolFactoryAbi_V3,
            [PoolType.Stable]: stablePoolFactoryAbi_V3,
            [PoolType.StableSurge]: stableSurgeFactoryAbi,
        },
    };

    const hash = await client.sendTransaction({
        to,
        data: callData,
        account: testAddress,
        chain: client.chain,
    });

    const transactionReceipt = await client.waitForTransactionReceipt({
        hash,
    });
    const poolCreatedEvent = findEventInReceiptLogs({
        receipt: transactionReceipt,
        eventName: 'PoolCreated',
        abi: abis[createPoolInput.protocolVersion][createPoolInput.poolType],
        to,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;

    return poolAddress;
}
