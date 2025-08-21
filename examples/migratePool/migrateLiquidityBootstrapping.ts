/**
 * Example script to create and init a v3 LBPool
 *
 * Change the default export to runAgainstFork or runAgainstNetwork
 *
 * Run with:
 * pnpm example ./examples/migratePool/migrateLiquidityBootstrapping.ts
 */

import { config } from 'dotenv';
config();

import {
    http,
    publicActions,
    parseUnits,
    createWalletClient,
    Address,
    erc20Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
    ChainId,
    PoolType,
    MigratePoolLiquidityBootstrappingInput,
    MigratePoolQueryInput,
    WeightedPoolParams,
    MigratePool,
    CHAINS,
} from 'src';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

// Create pool config
const chainId = ChainId.SEPOLIA;

// Make sure the sale has ended and replace with your required addresses
const poolToMigrate = '0x0c06B6D4EC451987e8C0B772ffcf7F080c46447A';
const blockToQuery = 8916919n;
const excessReceiver = '0x0c06B6D4EC451987e8C0B772ffcf7F080c46447A';
const querySender = '0x0c06B6D4EC451987e8C0B772ffcf7F080c46447A';

export default async function runAgainstNetwork() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error('rpcUrl is undefined');

    const client = createWalletClient({
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
        account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
    }).extend(publicActions);

    const { account } = client;

    const weightedPoolParams: WeightedPoolParams = {
        name: 'Migrated Pool',
        symbol: 'MP',
        pauseManager: '0x0000000000000000000000000000000000000000',
        swapFeeManager: '0x0000000000000000000000000000000000000000',
        swapFeePercentage: parseUnits('0.01', 18),
        poolHooksContract: '0x0000000000000000000000000000000000000000',
        enableDonation: false,
        disableUnbalancedLiquidity: false,
    };

    const migratePoolInput: MigratePoolLiquidityBootstrappingInput = {
        poolType: PoolType.LiquidityBootstrapping,
        pool: poolToMigrate,
        chainid: chainId,
        rpcUrl,
        excessReceiver: excessReceiver,
        weightedPoolParams,
    };

    const migratePoolQueryInput: MigratePoolQueryInput = {
        ...migratePoolInput,
        sender: querySender,
    };

    // The sender needs to approve the migration router to spend the pool's BPT
    const totalBptBalance = await client.readContract({
        address: migratePoolInput.pool,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [migratePoolQueryInput.sender as Address],
    });
    await client.writeContract({
        address: migratePoolInput.pool,
        abi: erc20Abi,
        functionName: 'approve',
        args: [AddressProvider.LBPoolMigrationRouter(chainId), totalBptBalance],
    });

    // Build the init pool call
    const migratePool = new MigratePool();
    const result = await migratePool.query(migratePoolQueryInput, blockToQuery);
    console.log('result', result);

    const migratePoolCall = migratePool.buildCall(migratePoolInput);

    // Send the migrate pool tx
    const migratePoolTxHash = await client.sendTransaction({
        account,
        data: migratePoolCall.callData,
        to: migratePoolCall.to,
    });
    const migratePoolTxReceipt = await client.waitForTransactionReceipt({
        hash: migratePoolTxHash,
    });
    console.log('migratePoolTxReceipt', migratePoolTxReceipt);
}
