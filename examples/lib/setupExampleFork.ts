import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    parseEther,
    parseAbi,
} from 'viem';
import { CHAINS, ChainId } from '../../src';
import { TOKENS } from 'test/lib/utils';

/**
 * V2: All pool operations happen on Mainnet
 * V3: All pool operations happen on Sepolia (pre-launch)
 */

export const setupExampleFork = async ({ chainId }: { chainId: ChainId }) => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const userAccount = (await client.getAddresses())[0];

    // Wrap ETH into WETH for default anvil account #0
    const WETH = TOKENS[chainId].WETH;
    const { request } = await client.simulateContract({
        account: userAccount,
        address: WETH.address,
        abi: parseAbi(['function deposit() payable']),
        functionName: 'deposit',
        args: [],
        value: parseEther('10'),
    });
    await client.writeContract(request);

    // TODO: swap wETH for BAL to prepare for add liquidity example

    // TODO: add liquidity to a pool to prepare for remove liquidity example

    return { client, rpcUrl, userAccount };
};
