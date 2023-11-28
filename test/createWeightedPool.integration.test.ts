import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
} from 'viem';
import { CHAINS, ChainId } from '../src';
import { CreatePool } from '../src/entities/createPool/createPool';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { doCreatePool } from './lib/utils/createPoolHelper';
import { CreatePoolTxInput } from './lib/utils/types';
import {
    CreatePoolInput, CreateWeightedPoolInput,
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

    test('Create Weighted Pool with 2 tokens', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool',
            symbol: 'TEST',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
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

    test('Create Weighted Pool with 3 tokens, automatically set weight', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
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
