// pnpm test -- v3/createPool/reClamm/reClamm.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
    parseUnits,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    PoolState,
    CreatePoolReClammInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    balancerV3Contracts,
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
    calculateReClammInitAmounts,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import {
    doCreatePool,
    TOKENS,
    assertInitPool,
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from '../../../lib/utils';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.ReClamm;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('ReClamm - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolReClammInput;
    let poolAddress: Address;
    let snapshot: Hex;
    let poolState: PoolState;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8123669n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [DAI.address, BAL.address],
            [DAI.slot!, BAL.slot!],
            [parseUnits('1000', 18), parseUnits('1000', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createPoolInput = {
            poolType,
            name: 'ReClamm Bal Dai',
            symbol: '50BAL-50DAI',
            tokens: [
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            initialMinPrice: parseUnits('0.5', 18),
            initialMaxPrice: parseUnits('8', 18),
            initialTargetPrice: parseUnits('3', 18),
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId,
            protocolVersion,
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput,
        });

        // Get pool state
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

        // Take a snapshot after pool creation
        snapshot = await client.snapshot();
    }, 120_000);

    beforeEach(async () => {
        // Revert to the snapshot before each test
        await client.revert({
            id: snapshot,
        });
        // Take a new snapshot for the next test
        snapshot = await client.snapshot();
    });

    test('pool should be created', async () => {
        expect(poolAddress).to.not.be.undefined;
    });

    test('pool should be registered with Vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('pool should init with BAL as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: BAL.address,
            rawAmount: parseUnits('69', BAL.decimals),
            decimals: BAL.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            createPoolInput,
            tokens: poolState.tokens,
            givenAmountIn,
        });

        const initPoolInput = {
            amountsIn,
            minBptAmountOut: 0n,
            chainId,
        };

        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPool = new InitPool();
        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            poolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, DAI.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('pool should init with DAI as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: DAI.address,
            rawAmount: parseUnits('420', DAI.decimals),
            decimals: DAI.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            createPoolInput,
            tokens: poolState.tokens,
            givenAmountIn,
        });

        const initPoolInput = {
            amountsIn,
            minBptAmountOut: 0n,
            chainId,
        };

        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPool = new InitPool();
        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            poolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, DAI.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
