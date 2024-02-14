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
import { CHAINS, ChainId, PoolType, TokenType } from '../../../src';
import { CreatePool } from '../../../src/entities/createPool';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { doCreatePool } from '../../lib/utils/createPoolHelper';
import { CreatePoolTxInput } from '../../lib/utils/types';
import {
    CreatePoolInput,
    CreatePoolV3WeightedInput,
} from '../../../src/entities/createPool/types';
import { TOKENS } from 'test/lib/utils/addresses';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.SEPOLIA;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createWeightedPoolInput: CreatePoolV3WeightedInput;
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
            poolType: PoolType.Weighted,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: TOKENS[chainId].BAL.address, // BAL
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                },
                {
                    address: TOKENS[chainId].WETH.address, // WETH
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                },
            ],
            chainId,
            balancerVersion: 3,
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
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
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
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther('0'),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther('1'),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
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
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createWeightedPoolInput, tokens },
            }),
        ).rejects.toThrowError('Duplicate token addresses');
    });
    test('Allowing only TokenType.STANDARD to have address zero as rateProvider', async () => {
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.ERC4626_TOKEN,
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createWeightedPoolInput, tokens },
            }),
        ).rejects.toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });
});
