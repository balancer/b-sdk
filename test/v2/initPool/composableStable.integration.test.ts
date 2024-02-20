// pnpm test -- initPool/composableStable.integration.test.ts

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
    CreatePoolV2ComposableStableInput,
    InitPoolDataProvider,
    InitPool,
    InitPoolInput
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { InitPoolTxInput, CreatePoolTxInput } from '../../lib/utils/types';
import { doCreatePool } from '../../lib/utils/createPoolHelper';
import { forkSetup } from '../../lib/utils/helper';
import { assertInitPool, doInitPool } from '../../lib/utils/initPoolHelper';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;

describe('Composable Stable Pool - Init Pool tests', async () => {
    let poolAddress: Address;
    let createPoolComposableStableInput: CreatePoolV2ComposableStableInput;
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
        createPoolComposableStableInput = {
            name: 'Test Pool',
            symbol: '50BAL-50WETH',
            poolType: PoolType.ComposableStable,
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: 100n,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: 100n,
                },
            ],
            amplificationParameter: 62n,
            exemptFromYieldProtocolFeeFlag: false,
            swapFee: '0.01',
            poolOwnerAddress: signerAddress, // Balancer DAO Multisig
            chainId,
            balancerVersion: 2,
        };

        createTxInput = {
            client,
            createPool: new CreatePool(),
            testAddress: signerAddress,
            createPoolInput: createPoolComposableStableInput,
        };

        initPoolInput = {
            sender: signerAddress,
            recipient: signerAddress,
            amountsIn: [
                {
                    address: createPoolComposableStableInput.tokens[0].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                },
                {
                    address: createPoolComposableStableInput.tokens[1].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
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
            PoolType.ComposableStable,
            2,
        );

        await forkSetup(
            initPoolTxInput.client,
            initPoolTxInput.testAddress,
            [...poolState.tokens.map((t) => t.address)],
            undefined,
            [...poolState.tokens.map((t) => parseUnits('100000', t.decimals))],
        );
    });
    test('Init Pool - Composable Stable Pool', async () => {
        const addLiquidityOutput = await doInitPool({
            ...initPoolTxInput,
            initPoolInput,
            poolState: poolState,
        });

        assertInitPool(initPoolInput, addLiquidityOutput);
    });
});
