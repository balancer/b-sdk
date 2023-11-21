import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import { CHAINS, ChainId } from '../src';
import { CreatePool } from '../src/entities/createPool/createPool';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { doCreatePool } from './lib/utils/createPoolHelper';
import { CreatePoolTxInput } from './lib/utils/types';
import {
    CreatePoolInput,
    WeightedCreatedPoolInput,
} from '../src/entities/createPool/types';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    beforeAll(async () => {
        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
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
    });

    test('Create Weighted Pool', async () => {
        const createWeightedPoolInput: WeightedCreatedPoolInput = {
            name: 'test pool',
            symbol: 'TEST',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: 0.5,
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: 0.5,
                },
            ],
            rateProviders: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProviderAddress: zeroAddress,
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProviderAddress: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createWeightedPoolInput,
        });
        expect(poolAddress).to.not.be.undefined;
    });
});
