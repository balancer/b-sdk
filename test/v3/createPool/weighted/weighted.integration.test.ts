// pnpm test -- v3/createPool/weighted/weighted.integration.test.ts

import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
    parseUnits,
    TestActions,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    CreatePoolV3WeightedInput,
    InitPoolDataProvider,
    InitPool,
    Slippage,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { forkSetup } from 'test/lib/utils/helper';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { doInitPool, assertInitPool } from 'test/lib/utils/initPoolHelper';
import { PublicWalletClient } from '@/utils';
import { VAULT_V3 } from 'src/utils/constants';
import { vaultExtensionAbi_V3 } from 'src/abi/';

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.SEPOLIA;
    const poolType = PoolType.Weighted;
    const protocolVersion = 3;

    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolV3WeightedInput;
    let poolAddress: Address;

    // Deploy (and register) a pool before the tests run
    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }), // // FIXME: createPool step takes a long time, so we increase the timeout as a temporary solution
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        createPoolInput = {
            poolType,
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
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion,
            enableDonation: false,
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput,
        });
    });

    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);

    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: VAULT_V3[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    }, 120_000);

    test('Initialization', async () => {
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

        await forkSetup(
            client,
            testAddress,
            [...poolState.tokens.map((t) => t.address)],
            [3, 1],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
            undefined,
            protocolVersion,
        );

        const initPoolInput = {
            amountsIn: [
                {
                    address: createPoolInput.tokens[0].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                },
                {
                    address: createPoolInput.tokens[1].address,
                    rawAmount: parseEther('100'),
                    decimals: 18,
                },
            ],
            minBptAmountOut: parseEther('90'),
            chainId,
        };

        const addLiquidityOutput = await doInitPool({
            client,
            testAddress,
            initPoolInput,
            poolState,
            initPool: new InitPool(),
            slippage: Slippage.fromPercentage('0.01'),
        });

        assertInitPool(initPoolInput, addLiquidityOutput);
    }, 120_000);
});
