// pnpm test -- createPool/weighted.integration.test.ts

import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import { CHAINS, ChainId, PoolType } from '../../../src';
import { CreatePool } from '../../../src/entities/createPool';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { doCreatePool } from '../../lib/utils/createPoolHelper';
import { CreatePoolTxInput } from '../../lib/utils/types';
import {
    CreatePoolInput,
    CreatePoolWeightedInput,
} from '../../../src/entities/createPool/types';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createWeightedPoolInput: CreatePoolWeightedInput;
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

        createWeightedPoolInput = {
            name: 'Test Pool',
            poolType: PoolType.Weighted,
            symbol: '50BAL-25WETH-25DAI',
            tokens: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 4}`),
                    rateProvider: zeroAddress,
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    weight: parseEther(`${1 / 4}`),
                    rateProvider: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
            balancerVersion: 2,
        };
    });
    test('Create Weighted Pool', async () => {
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createWeightedPoolInput,
        });
        expect(poolAddress).to.not.be.undefined;
    });

    test('Wrong weights, expects error', async () => {
        const tokens: CreatePoolWeightedInput['tokens'] = [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createWeightedPoolInput, tokens },
            }),
        ).rejects.toThrowError('Weights must sum to 1e18');
    });

    test('Weight value 0, expects error', async () => {
        const tokens: CreatePoolWeightedInput['tokens'] = [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther('0'),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createWeightedPoolInput, tokens },
            }),
        ).rejects.toThrowError('Weight cannot be 0');
    });
    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolWeightedInput['tokens'] = [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                weight: parseEther(`${1 / 3}`),
                rateProvider: zeroAddress,
            },
            {
                tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                weight: parseEther(`${1 / 3 + 1e-16}`),
                rateProvider: zeroAddress,
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createWeightedPoolInput, tokens },
            }),
        ).rejects.toThrowError('Duplicate token addresses');
    });
});
