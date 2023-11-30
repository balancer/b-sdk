import {
    Address,
    createTestClient,
    http,
    parseEther,
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
    CreateWeightedPoolInput,
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
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther('0.5').toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther('0.5').toString(),
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
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createWeightedPoolInput,
        });
        expect(poolAddress).to.not.be.undefined;
    });

    test('Wrong weights, expect error', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 3}`).toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 3}`).toString(),
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 3}`).toString(),
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
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProviderAddress: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: createWeightedPoolInput,
            }),
        ).rejects.toThrowError('Weights must sum to 1e18');
    });
    test('Wrong tokens in rateProvider, expects error', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 2}`).toString(),
                },
            ],
            rateProviders: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a434e3d',
                    rateProviderAddress: zeroAddress,
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProviderAddress: zeroAddress,
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProviderAddress: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: createWeightedPoolInput,
            }),
        ).rejects.toThrowError(
            'Rate provider not found for token: 0xba100000625a3754423978a60c9317c58a424e3d',
        );
    });
    test('Wrong tokens in weights, expects error', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a444e3d',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 2}`).toString(),
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
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProviderAddress: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: createWeightedPoolInput,
            }),
        ).rejects.toThrowError(
            'Weight not found for token: 0xba100000625a3754423978a60c9317c58a424e3d',
        );
    });
    test('Tokens and Weights length mismatch, expects error', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 2}`).toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 2}`).toString(),
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
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProviderAddress: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: createWeightedPoolInput,
            }),
        ).rejects.toThrowError('Tokens and weights must be the same length');
    });
    test('Tokens and Rate Providers length mismatch, expects error', async () => {
        const createWeightedPoolInput: CreateWeightedPoolInput = {
            name: 'test pool2',
            symbol: 'TEST2',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            ],
            weights: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 4}`).toString(),
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 2}`).toString(),
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
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: createWeightedPoolInput,
            }),
        ).rejects.toThrowError(
            'Tokens and rateProviders must have the same length',
        );
    });
});
