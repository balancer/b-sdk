import { CreatePoolTxInput } from './types';
import { Address, WEIGHTED_POOL_FACTORY } from '../../../src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';
import { weightedFactoryV4Abi } from '../../../src/abi/weightedFactoryV4';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPool, createPoolInput, testAddress } = txInput;

    const { call } = createPool.buildCreatePoolCall(
        'WEIGHTED',
        createPoolInput,
    );
    const chainId = await client.getChainId();

    const weightedPoolFactoryAddress = WEIGHTED_POOL_FACTORY[chainId];

    const hash = await client.sendTransaction({
        to: weightedPoolFactoryAddress,
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
        abi: weightedFactoryV4Abi,
        to: weightedPoolFactoryAddress,
    });

    const {
        args: { pool: poolAddress },
    } = poolCreatedEvent;
    
    return poolAddress;
}
