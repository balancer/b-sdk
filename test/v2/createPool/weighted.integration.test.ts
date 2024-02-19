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
    CreatePoolV2WeightedInput,
} from '../../../src/entities/createPool/types';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createWeightedPoolInput: CreatePoolV2WeightedInput;
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
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
            chainId,
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
});
