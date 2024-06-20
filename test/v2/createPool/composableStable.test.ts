// pnpm test -- test/createPool/composableStable.test.ts

import { zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    CreatePool,
    CreatePoolV2ComposableStableInput,
} from 'src';

describe('Create Composable Stable Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let createPoolComposableStableInput: CreatePoolV2ComposableStableInput;
    const createPool = new CreatePool();
    beforeAll(async () => {
        createPoolComposableStableInput = {
            name: 'Test Pool',
            poolType: PoolType.ComposableStable,
            symbol: '50BAL-25WETH-25DAI',
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
            ],
            amplificationParameter: BigInt(67),
            exemptFromYieldProtocolFeeFlag: false,
            swapFee: '0.01',
            poolOwnerAddress: zeroAddress,
            chainId,
            protocolVersion: 2,
        };
    });
    test('Amplification Parameter 0, expects error', async () => {
        const amplificationParameter = BigInt(0);
        expect(() =>
            createPool.buildCall({
                ...createPoolComposableStableInput,
                amplificationParameter,
            }),
        ).toThrowError('Amplification parameter must be greater than 0');
    });
    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolV2ComposableStableInput['tokens'] = [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
        ];
        expect(() =>
            createPool.buildCall({
                ...createPoolComposableStableInput,
                tokens,
            }),
        ).toThrowError('Duplicate token addresses');
    });
});
