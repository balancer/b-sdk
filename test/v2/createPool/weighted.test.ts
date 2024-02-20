// pnpm test -- createPool/weighted.test.ts

import { parseEther, zeroAddress } from 'viem';
import { ChainId, PoolType, CreatePool, CreatePoolV2WeightedInput } from 'src';

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.MAINNET;
    const createPool = new CreatePool();
    let createWeightedPoolInput: CreatePoolV2WeightedInput;
    beforeAll(async () => {
        createWeightedPoolInput = {
            name: 'Test Pool',
            poolType: PoolType.Weighted,
            symbol: '50BAL-25WETH-25DAI',
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 4}`),
                    rateProvider: zeroAddress,
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 4}`),
                    rateProvider: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: zeroAddress, // Balancer DAO Multisig
            chainId,
            balancerVersion: 2,
        };
    });

    test('Wrong weights, expects error', async () => {
        const tokens: CreatePoolV2WeightedInput['tokens'] = [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Weights must sum to 1e18');
    });

    test('Weight value 0, expects error', async () => {
        const tokens: CreatePoolV2WeightedInput['tokens'] = [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther('0'),
                rateProvider: zeroAddress,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Weight cannot be 0');
    });
    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolV2WeightedInput['tokens'] = [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 3 + 1e-16}`),
                rateProvider: zeroAddress,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Duplicate token addresses');
    });
});
