import { CreatePoolTxInput } from './types';
import {
    CreatePool,
    Address,
    PoolType,
    weightedPoolFactoryAbiExtended_V2,
    composableStableFactoryAbiExtended,
    weightedPoolFactoryAbiExtended_V3,
    stablePoolFactoryAbiExtended,
    gyroECLPPoolFactoryAbiExtended,
    stableSurgeFactoryAbiExtended,
    liquidityBoostrappingFactoryAbi,
} from 'src';
import { findEventInReceiptLogs } from './findEventInReceiptLogs';

export async function doCreatePool(
    txInput: CreatePoolTxInput,
): Promise<Address> {
    const { client, createPoolInput, testAddress } = txInput;

    const createPool = new CreatePool();
    const { callData, to } = createPool.buildCall(createPoolInput);

    const abis = {
        2: {
            [PoolType.Weighted]: weightedPoolFactoryAbiExtended_V2,
            [PoolType.ComposableStable]: composableStableFactoryAbiExtended,
        },
        3: {
            [PoolType.Weighted]: weightedPoolFactoryAbiExtended_V3,
            [PoolType.Stable]: stablePoolFactoryAbiExtended,
            [PoolType.StableSurge]: stableSurgeFactoryAbiExtended,
            [PoolType.GyroE]: gyroECLPPoolFactoryAbiExtended,
            [PoolType.LiquidityBootstrapping]: liquidityBoostrappingFactoryAbi,
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
