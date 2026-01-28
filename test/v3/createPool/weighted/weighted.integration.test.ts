// pnpm test test/v3/createPool/weighted/weighted.integration.test.ts

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
    Permit2Helper,
    PERMIT2,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import { PublicWalletClient } from '@/utils';
import { vaultExtensionAbi_V3 } from 'src/abi/';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

const { rpcUrl } = await startFork(
    ANVIL_NETWORKS.SEPOLIA,
    undefined,
    10140629n,
);
const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.Weighted;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('create weighted pool test', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolV3WeightedInput;
    let poolAddress: Address;

    // Deploy (and register) a pool before the tests run
    beforeAll(async () => {
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }), // FIXME: createPool step takes a long time, so we increase the timeout as a temporary solution
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        createPoolInput = {
            poolType,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: BAL.address,
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: WETH.address,
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            poolCreator: testAddress,
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
    }, 120_000);

    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
    });

    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: AddressProvider.Vault(chainId),
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('Initialization', async () => {
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

        await setTokenBalances(
            client,
            testAddress,
            poolState.tokens.map((t) => t.address),
            [WETH.slot!, BAL.slot!],
            poolState.tokens.map((t) => parseUnits('100', t.decimals)),
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            poolState.tokens.map((t) => t.address),
            PERMIT2[chainId],
        );

        const initPoolInput = {
            amountsIn: [
                {
                    address: createPoolInput.tokens[0].address,
                    rawAmount: parseEther('100'),
                    decimals: BAL.decimals,
                },
                {
                    address: createPoolInput.tokens[1].address,
                    rawAmount: parseEther('100'),
                    decimals: WETH.decimals,
                },
            ],
            minBptAmountOut: parseEther('90'),
            chainId,
        };

        const initPool = new InitPool();
        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });
        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            poolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, WETH.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    });
});
