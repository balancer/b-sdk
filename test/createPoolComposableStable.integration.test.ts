import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import { CHAINS, ChainId, PoolType } from '../src';
import { CreatePool } from '../src/entities/createPool/createPool';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { doCreatePool } from './lib/utils/createPoolHelper';
import { CreatePoolTxInput } from './lib/utils/types';
import {
    CreatePoolComposableStableInput,
    CreatePoolInput,
} from '../src/entities/createPool/types';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Create Composable Stable Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createPoolComposableStableInput: CreatePoolComposableStableInput;
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
            poolType: PoolType.ComposableStable,
        };

        createPoolComposableStableInput = {
            name: 'Test Pool',
            symbol: '50BAL-25WETH-25DAI',
            tokens: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
            ],
            amplificationParameter: BigInt(67),
            exemptFromYieldProtocolFeeFlag: false,
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
        };
    });
    test('Create Composable Stable Pool', async () => {
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createPoolComposableStableInput,
        });
        expect(poolAddress).to.not.be.undefined;
    });

    test('Amplification Parameter 0, expects error', async () => {
        const amplificationParameter = BigInt(0);
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: {
                    ...createPoolComposableStableInput,
                    amplificationParameter,
                },
            }),
        ).rejects.toThrowError(
            'Amplification parameter must be greater than 0',
        );
    });
    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolComposableStableInput['tokens'] = [
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
            {
                tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                rateProvider: zeroAddress,
                tokenRateCacheDuration: BigInt(100),
            },
        ];
        await expect(() =>
            doCreatePool({
                ...txInput,
                createPoolInput: { ...createPoolComposableStableInput, tokens },
            }),
        ).rejects.toThrowError('Duplicate token addresses');
    });
});
