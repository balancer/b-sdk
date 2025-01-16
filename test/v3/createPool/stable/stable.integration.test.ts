// pnpm test -- v3/createPool/stable/stable.integration.test.ts

import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
    TestActions,
    parseUnits,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    CreatePoolV3StableInput,
    InitPoolDataProvider,
    Slippage,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { PublicWalletClient } from '@/utils';
import { VAULT_V3 } from 'src/utils/constants';
import { vaultExtensionAbi_V3 } from 'src/abi/';
import { doInitPool, assertInitPool } from 'test/lib/utils/initPoolHelper';
import { forkSetup } from 'test/lib/utils/helper';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.Stable;
const scUSD = TOKENS[chainId].scUSD;
const scDAI = TOKENS[chainId].scDAI;

describe('create stable pool test', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolV3StableInput;
    let poolAddress: Address;

    beforeAll(async () => {
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        createPoolInput = {
            poolType,
            chainId,
            protocolVersion,
            name: 'scUSD scDAI Stable Pool',
            symbol: 'scUSD-scDAI',
            amplificationParameter: 420n,
            tokens: [
                {
                    address: scUSD.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: scDAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            disableUnbalancedLiquidity: false,
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
            poolState.tokens.map((t) => t.address),
            [scDAI.slot!, scUSD.slot!],
            poolState.tokens.map((t) => parseUnits('100', t.decimals)),
            undefined,
            protocolVersion,
        );

        const initPoolInput = {
            amountsIn: [
                {
                    address: createPoolInput.tokens[0].address,
                    rawAmount: parseUnits('100', scUSD.decimals),
                    decimals: scUSD.decimals,
                },
                {
                    address: createPoolInput.tokens[1].address,
                    rawAmount: parseUnits('100', scDAI.decimals),
                    decimals: scDAI.decimals,
                },
            ],
            minBptAmountOut: parseEther('10'),
            chainId,
        };

        const addLiquidityOutput = await doInitPool({
            client,
            testAddress,
            initPoolInput,
            poolState,
            slippage: Slippage.fromPercentage('0.01'),
        });

        assertInitPool(initPoolInput, addLiquidityOutput);
    }, 120_000);
});
