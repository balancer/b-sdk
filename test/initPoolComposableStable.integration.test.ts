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
    AddLiquidityKind,
    Address,
    CHAINS,
    ChainId,
    PoolState,
    PoolType,
    Slippage,
} from '../src';
import { CreatePool } from '../src/entities/createPool/createPool';
import { CreatePoolComposableStableInput } from '../src/entities/createPool/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { InitPoolTxInput, CreatePoolTxInput } from './lib/utils/types';
import { doCreatePool } from './lib/utils/createPoolHelper';
import { InitPoolDataProvider } from '../src/data/providers/initPoolDataProvider';
import { forkSetup } from './lib/utils/helper';
import { InitPool } from '../src/entities/initPool/initPool';
import { InitPoolInput } from '../src/entities/initPool/types';
import { assertInitPool, doInitPool } from './lib/utils/initPoolHelper';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;

describe('Composable Stable Pool - Init Pool tests', async () => {
    let poolAddress: Address;
    let createPoolComposableStableInput: CreatePoolComposableStableInput;
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
            tokens: [
                {
                    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: '100',
                },
                {
                    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: '100',
                },
            ],
            amplificationParameter: '62',
            exemptFromYieldProtocolFeeFlag: false,
            swapFee: '0.01',
            poolOwnerAddress: signerAddress, // Balancer DAO Multisig
        };

        createTxInput = {
            client,
            createPool: new CreatePool(),
            testAddress: signerAddress,
            createPoolInput: createPoolComposableStableInput,
            poolType: PoolType.ComposableStable,
        };

        initPoolInput = {
            sender: signerAddress,
            recipient: signerAddress,
            amountsIn: [
                {
                    address:
                        createPoolComposableStableInput.tokens[0].tokenAddress,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                },
                {
                    address:
                        createPoolComposableStableInput.tokens[1].tokenAddress,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                },
            ],
            kind: AddLiquidityKind.Init,
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
            initPoolInput.amountsIn,
        );

        await forkSetup(
            initPoolTxInput.client,
            initPoolTxInput.testAddress,
            [...poolState.tokens.map((t) => t.address)],
            undefined,
            [...poolState.tokens.map((t) => parseUnits('100000', t.decimals))],
        );
    });
    test('Add Liquidity Init - Composable Stable Pool', async () => {
        const addLiquidityOutput = await doInitPool({
            ...initPoolTxInput,
            initPoolInput,
            poolState: poolState,
        });

        assertInitPool(initPoolInput, addLiquidityOutput);
    });
});
