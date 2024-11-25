import { startFork } from '../../test/anvil/anvil-global-setup';
import { ANVIL_NETWORKS } from '../../test/anvil/anvil-global-setup';
import { createTestClient, http, publicActions, walletActions } from 'viem';
import { CHAINS, ChainId } from '../../src';
import { Address } from 'viem';

/**
 * Default fork setup for all SDK examples
 * 1. use default anvil account to wrap ETH into wETH (allows for swap example)
 * 2. swap wETH for BAL (allows for proportional add example)
 * 3. adds liquidity to 80BAL-20WETH pool (allows for remove example)
 */

export const setupFork = async () => {
    const chainId = ChainId.SEPOLIA;
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const userAccount = (await client.getAddresses())[0];
    const balance = await client.getBalance({ address: userAccount });

    console.log('balance', balance);

    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address;

    return { client, userAccount };
};
