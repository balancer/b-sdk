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
    parseAbi,
    erc4626Abi,
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
const stataUSDC = TOKENS[chainId].stataUSDC;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;
const USDC = TOKENS[chainId].USDC_AAVE;

describe('ReClamm - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createWethStataUsdcPoolInput: CreatePoolReClammInput;
    let createBalDaiPoolInput: CreatePoolReClammInput;
    let wethStataUsdcPoolAddress: Address;
    let balDaiPoolAddress: Address;
    let wethUsdcPoolState: PoolState;
    let balDaiPoolState: PoolState;
    let snapshot: Hex;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8193333n,
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
            [stataUSDC.address, WETH.address, DAI.address, BAL.address],
            [stataUSDC.slot!, WETH.slot!, DAI.slot!, BAL.slot!],
            [
                parseUnits('1000', stataUSDC.decimals),
                parseUnits('1000', WETH.decimals),
                parseUnits('1000', DAI.decimals),
                parseUnits('1000', BAL.decimals),
            ],
        );

        // Can't set token balance for erc4626 with slot?
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDC.address],
            stataUSDC.address,
        );
        const hash = await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataUSDC.address,
            functionName: 'deposit',
            args: [parseUnits('1000', USDC.decimals), testAddress],
        });

        // wait for deposit confirmation before starting tests
        await client.waitForTransactionReceipt({
            hash,
        });

        // check token balances
        const stataUSDCBalance = await client.readContract({
            address: stataUSDC.address,
            abi: parseAbi([
                'function balanceOf(address account) view returns (uint256)',
            ]),
            functionName: 'balanceOf',
            args: [testAddress],
        });
        console.log('stataUSDCBalance:', stataUSDCBalance);

        await approveSpenderOnTokens(
            client,
            testAddress,
            [stataUSDC.address, WETH.address, DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createWethStataUsdcPoolInput = {
            poolType,
            symbol: 'WETH-stataUSDC',
            tokens: [
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: stataUSDC.address,
                    rateProvider: '0x34101091673238545de8a846621823d9993c3085',
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
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
            ...createWethStataUsdcPoolInput,
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

        wethStataUsdcPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createWethStataUsdcPoolInput,
        });

        balDaiPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createBalDaiPoolInput,
        });

        // Get pool state
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        wethUsdcPoolState = await initPoolDataProvider.getInitPoolData(
            wethStataUsdcPoolAddress,
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
        expect(wethStataUsdcPoolAddress).to.not.be.undefined;
    });

    test('pool should be registered with Vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [wethStataUsdcPoolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('wethUsdcPool should init with WETH as given token', async () => {
        // sanity check for reclamm init amount maths
        const proportion = await client.readContract({
            address: wethStataUsdcPoolAddress,
            abi: parseAbi([
                'function computeInitialBalanceRatio() view returns (uint256)',
            ]),
            functionName: 'computeInitialBalanceRatio',
            args: [],
        });
        console.log('proportion from SC', proportion);

        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: WETH.address,
            rawAmount: parseUnits('1', WETH.decimals),
            decimals: WETH.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createWethStataUsdcPoolInput,
            tokens: wethUsdcPoolState.tokens,
            givenAmountIn,
        });

        console.log('amountsIn', amountsIn);

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
            [WETH.address, stataUSDC.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('wethUsdcPool should init with stataUSDC as given token', async () => {
        // user chooses an amount for one of the tokens
        const givenAmountIn = {
            address: stataUSDC.address,
            rawAmount: parseUnits('1', stataUSDC.decimals),
            decimals: stataUSDC.decimals,
        };

        // helper calculates the amount for the other token
        const amountsIn = await calculateReClammInitAmounts({
            ...createWethStataUsdcPoolInput,
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
            [WETH.address, stataUSDC.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test.skip('balDaiPool should init with BAL as given token', async () => {
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

    test.skip('balDaiPool should init with DAI as given token', async () => {
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
