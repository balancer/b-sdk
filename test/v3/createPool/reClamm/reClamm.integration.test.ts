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
    // erc20Abi,
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
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('ReClamm - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createWethUsdcPoolInput: CreatePoolReClammInput;
    let createBalDaiPoolInput: CreatePoolReClammInput;
    let wethUsdcPoolAddress: Address;
    let balDaiPoolAddress: Address;
    let wethUsdcPoolState: PoolState;
    let balDaiPoolState: PoolState;
    let snapshot: Hex;

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
            [USDC.address, WETH.address, DAI.address, BAL.address],
            [USDC.slot!, WETH.slot!, DAI.slot!, BAL.slot!],
            [
                parseUnits('1000', USDC.decimals),
                parseUnits('1000', WETH.decimals),
                parseUnits('1000', DAI.decimals),
                parseUnits('1000', BAL.decimals),
            ],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDC.address, WETH.address, DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createWethUsdcPoolInput = {
            poolType,
            symbol: 'WETH-USDC',
            tokens: [
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: USDC.address,
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

        createBalDaiPoolInput = {
            ...createWethUsdcPoolInput,
            symbol: 'BAL-DAI',
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
        };

        wethUsdcPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createWethUsdcPoolInput,
        });

        balDaiPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createBalDaiPoolInput,
        });

        // Get pool state
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        wethUsdcPoolState = await initPoolDataProvider.getInitPoolData(
            wethUsdcPoolAddress,
            poolType,
            protocolVersion,
        );

        balDaiPoolState = await initPoolDataProvider.getInitPoolData(
            balDaiPoolAddress,
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
        expect(wethUsdcPoolAddress).to.not.be.undefined;
    });

    test('pool should be registered with Vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [wethUsdcPoolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('wethUsdcPool should init with WETH as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: WETH.address,
            rawAmount: parseUnits('1', WETH.decimals),
            decimals: WETH.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createWethUsdcPoolInput,
            tokens: wethUsdcPoolState.tokens,
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
            wethUsdcPoolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [WETH.address, USDC.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('wethUsdcPool should init with USDC as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: USDC.address,
            rawAmount: parseUnits('1', USDC.decimals),
            decimals: USDC.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createWethUsdcPoolInput,
            tokens: wethUsdcPoolState.tokens,
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
            wethUsdcPoolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [WETH.address, USDC.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('balDaiPool should init with BAL as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: BAL.address,
            rawAmount: parseUnits('1', BAL.decimals),
            decimals: BAL.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createBalDaiPoolInput,
            tokens: balDaiPoolState.tokens,
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
            balDaiPoolState,
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

    test('balDaiPool should init with DAI as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: DAI.address,
            rawAmount: parseUnits('1', DAI.decimals),
            decimals: DAI.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createBalDaiPoolInput,
            tokens: balDaiPoolState.tokens,
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
            balDaiPoolState,
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
