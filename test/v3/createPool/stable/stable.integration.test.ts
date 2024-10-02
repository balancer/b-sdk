// pnpm test -- v3/createPool/stable/stable.integration.test.ts

import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolInput,
    CreatePoolV3StableInput,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { CreatePoolTxInput } from '../../../lib/utils/types';
import { TOKENS } from 'test/lib/utils/addresses';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);

describe('Create Stable Pool tests', () => {
    const chainId = ChainId.SEPOLIA;

    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createStablePoolInput: CreatePoolV3StableInput;

    beforeAll(async () => {
        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        const signerAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            createPool: new CreatePool(),
            testAddress: signerAddress,
            createPoolInput: {} as CreatePoolInput,
        };

        createStablePoolInput = {
            poolType: PoolType.Stable,
            name: 'DAI USDC Stable Pool',
            symbol: 'DAI-USDC',
            amplificationParameter: 420n,
            tokens: [
                {
                    address: TOKENS[chainId].USDC.address, // USDC
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: TOKENS[chainId].DAI.address, // DAI
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: signerAddress,
            swapFeeManager: signerAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion: 3,
            enableDonation: false,
        };
    });
    test('Create Stable Pool', async () => {
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createStablePoolInput,
        });
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);
});
