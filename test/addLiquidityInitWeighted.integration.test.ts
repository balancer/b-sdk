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
    AddLiquidity,
    AddLiquidityInitInput,
    AddLiquidityKind,
    Address,
    CHAINS,
    ChainId,
    PoolStateInput,
    Slippage,
} from '../src';
import { CreatePool } from '../src/entities/createPool/createPool';
import { CreateWeightedPoolInput } from '../src/entities/createPool/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { AddLiquidityTxInput, CreatePoolTxInput } from './lib/utils/types';
import { doCreatePool } from './lib/utils/createPoolHelper';
import { AddLiquidityInitPoolDataProvider } from '../src/data/providers/addLiquidityInitPoolDataProvider';
import {
    assertAddLiquidityInit,
    doAddLiquidityInit,
} from './lib/utils/addLiquidityHelper';
import { forkSetup } from './lib/utils/helper';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;

describe('Add Liquidity Init - Weighted Pool', async () => {
    let poolAddress: Address;
    let createWeightedPoolInput: CreateWeightedPoolInput;
    let createTxInput: CreatePoolTxInput;
    let addLiquidityInitTxInput: AddLiquidityTxInput;
    let addLiquidityInitInput: AddLiquidityInitInput;
    let poolState: PoolStateInput;
    beforeAll(async () => {
        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);
        const addLiquidityInitPoolDataProvider =
            new AddLiquidityInitPoolDataProvider(chainId, rpcUrl);
        const signerAddress = (await client.getAddresses())[0];
        createWeightedPoolInput = {
            name: 'Test Pool',
            symbol: '50BAL-50WETH',
            tokens: [
                '0xba100000625a3754423978a60c9317c58a424e3d', //BAL
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
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
            ],
            swapFee: '0.01',
            poolOwnerAddress: signerAddress, // Balancer DAO Multisig
        };

        createTxInput = {
            client,
            createPool: new CreatePool(),
            testAddress: signerAddress,
            createPoolInput: createWeightedPoolInput,
        };

        addLiquidityInitInput = {
            sender: signerAddress,
            recipient: signerAddress,
            amountsIn: [
                {
                    address: createWeightedPoolInput.tokens[0],
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    weight: parseEther(`${1 / 2}`),
                },
                {
                    address: createWeightedPoolInput.tokens[1],
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    weight: parseEther(`${1 / 2}`),
                },
            ],
            kind: AddLiquidityKind.Init,
            chainId,
            rpcUrl,
        };
        poolAddress = await doCreatePool(createTxInput);

        addLiquidityInitTxInput = {
            client,
            addLiquidity: new AddLiquidity(),
            testAddress: signerAddress,
            addLiquidityInput: {} as AddLiquidityInitInput,
            slippage: Slippage.fromPercentage('0.01'),
            poolStateInput: {} as PoolStateInput,
        };

        poolState =
            await addLiquidityInitPoolDataProvider.getAddLiquidityInitPoolData(
                poolAddress,
                'WEIGHTED',
                addLiquidityInitInput.amountsIn,
                createWeightedPoolInput,
            );
        await forkSetup(
            addLiquidityInitTxInput.client,
            addLiquidityInitTxInput.testAddress,
            [...poolState.tokens.map((t) => t.address)],
            undefined,
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );
    });
    test('Add Liquidity Init - Weighted Pool', async () => {
        const addLiquidityOutput = await doAddLiquidityInit({
            ...addLiquidityInitTxInput,
            addLiquidityInput: addLiquidityInitInput,
            poolStateInput: poolState,
        });

        assertAddLiquidityInit(addLiquidityInitInput, addLiquidityOutput);
    });
});
