// pnpm test -- test/createPool/composableStable.integration.test.ts

import {
    Address,
    createTestClient,
    http,
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
    CreatePoolV2ComposableStableInput,
} from '../../../src/entities/createPool/types';

describe('Create Composable Stable Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
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
            balancerVersion: 2,
        };
    });
    test('Amplification Parameter 0, expects error', async () => {
        const amplificationParameter = BigInt(0);
        expect(() =>
            createPool.buildCall({...createPoolComposableStableInput, amplificationParameter})
        ).toThrowError(
            'Amplification parameter must be greater than 0',
        );
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
        createPool.buildCall({...createPoolComposableStableInput, tokens})
    ).toThrowError('Duplicate token addresses');
    });
});
