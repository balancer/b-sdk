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
            transport: http(rpcUrl, { timeout: 20_000 }),
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
});
