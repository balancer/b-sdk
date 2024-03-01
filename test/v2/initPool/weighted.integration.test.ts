// pnpm test -- initPool/weighted.integration.test.ts

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import {
    Address,
    CHAINS,
    ChainId,
    PoolState,
    PoolType,
    Slippage,
    CreatePool,
    CreatePoolV2WeightedInput,
    InitPoolDataProvider,
    InitPool,
    InitPoolInput,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { InitPoolTxInput, CreatePoolTxInput } from '../../lib/utils/types';
import { doCreatePool } from '../../lib/utils/createPoolHelper';
import { forkSetup } from '../../lib/utils/helper';
import { assertInitPool, doInitPool } from '../../lib/utils/initPoolHelper';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;

describe('Add Liquidity Init - Weighted Pool', async () => {
    let poolAddress: Address;
    let createPoolWeightedInput: CreatePoolV2WeightedInput;
    let createTxInput: CreatePoolTxInput;
    let initPoolTxInput: InitPoolTxInput;
    let initPoolInput: InitPoolInput;
    let poolState: PoolState;
    beforeAll(async () => {
        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const signerAddress = (await client.getAddresses())[0];
        createPoolWeightedInput = {
            name: 'Test Pool',
            poolType: PoolType.Weighted,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d',
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                },
            ],
            swapFee: '0.01',
            poolOwnerAddress: signerAddress, // Balancer DAO Multisig
            chainId,
            vaultVersion: 2,
        };

        createTxInput = {
            client,
            createPool: new CreatePool(),
            testAddress: signerAddress,
            createPoolInput: createPoolWeightedInput,
        };

        initPoolInput = {
            sender: signerAddress,
            recipient: signerAddress,
            amountsIn: [
                {
                    address: createPoolWeightedInput.tokens[0].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    weight: parseEther(`${1 / 2}`),
                },
                {
                    address: createPoolWeightedInput.tokens[1].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    weight: parseEther(`${1 / 2}`),
                },
            ],
            chainId,
        };
        poolAddress = await doCreatePool(createTxInput);

        initPoolTxInput = {
            client,
            initPool: new InitPool(),
            testAddress: signerAddress,
            initPoolInput: {} as InitPoolInput,
            slippage: Slippage.fromPercentage('0.01'),
            poolState: {} as PoolState,
        };

        poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            PoolType.Weighted,
            2,
        );
        await forkSetup(
            initPoolTxInput.client,
            initPoolTxInput.testAddress,
            [...poolState.tokens.map((t) => t.address)],
            [1, 3],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );
    });
    test('Add Liquidity Init - Weighted Pool', async () => {
        const addLiquidityOutput = await doInitPool({
            ...initPoolTxInput,
            initPoolInput,
            poolState: poolState,
        });

        assertInitPool(initPoolInput, addLiquidityOutput);
    });
});
