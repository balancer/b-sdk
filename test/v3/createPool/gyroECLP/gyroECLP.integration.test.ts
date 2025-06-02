// pnpm test v3/createPool/gyroECLP/gyroECLP.integration.test.ts
import {
    Address,
    createTestClient,
    http,
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
    CreatePoolGyroECLPInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    balancerV3Contracts,
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
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
const poolType = PoolType.GyroE;
const WETH = TOKENS[chainId].WETH;
const DAI = TOKENS[chainId].DAI;

describe('GyroECLP - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let InputWithProperOrder: CreatePoolGyroECLPInput;
    let InputWithReversedOrder: CreatePoolGyroECLPInput;
    let poolAddress: Address;
    let poolAddressReversedOrder: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            7923022n,
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
            [DAI.address, WETH.address],
            [DAI.slot!, WETH.slot!],
            [parseUnits('10000', 18), parseUnits('10000', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address, WETH.address],
            PERMIT2[chainId],
        );

        // WETH in terms of DAI
        InputWithProperOrder = {
            poolType,
            symbol: 'GYRO-WETH-DAI',
            tokens: [
                {
                    address: WETH.address,
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
            swapFeePercentage: 10000000000000000n,
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion,
            enableDonation: false,
            eclpParams: {
                alpha: parseUnits('2320', 18),
                beta: parseUnits('2835', 18),
                c: parseUnits('0.000391844822639777', 18),
                s: parseUnits('0.999999923228814538', 18),
                lambda: parseUnits('100000', 18),
            },
        };

        // DAI in terms of WETH
        InputWithReversedOrder = {
            ...InputWithProperOrder,
            tokens: [
                {
                    address: DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            eclpParams: {
                alpha: parseUnits('0.00035', 18),
                beta: parseUnits('0.00043', 18),
                s: parseUnits('0.000391844822639777', 18),
                c: parseUnits('0.999999923228814538', 18),
                lambda: parseUnits('100000', 18),
            },
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: InputWithProperOrder,
        });

        poolAddressReversedOrder = await doCreatePool({
            client,
            testAddress,
            createPoolInput: InputWithReversedOrder,
        });
    }, 120_000);

    test('create with proper order', async () => {
        expect(poolAddress).to.not.be.undefined;
    });

    test('create with reversed order', async () => {
        expect(poolAddressReversedOrder).to.not.be.undefined;
    });

    test('registration with vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('registration with vault (reversed order)', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddressReversedOrder],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('init with proper order', async () => {
        const initPoolInput = {
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('1', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: DAI.address,
                    rawAmount: parseUnits('2552', DAI.decimals),
                    decimals: DAI.decimals,
                },
            ],
            minBptAmountOut: 0n,
            chainId,
        };

        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

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
            [WETH.address, DAI.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('init with reversed order', async () => {
        const initPoolInput = {
            amountsIn: [
                {
                    address: DAI.address,
                    rawAmount: parseUnits('2552', DAI.decimals),
                    decimals: DAI.decimals,
                },
                {
                    address: WETH.address,
                    rawAmount: parseUnits('1', WETH.decimals),
                    decimals: WETH.decimals,
                },
            ],
            minBptAmountOut: 0n,
            chainId,
        };

        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddressReversedOrder,
            poolType,
            protocolVersion,
        );

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
            [DAI.address, WETH.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
