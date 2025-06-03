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
    mockGyroEclpPoolAbi_V3,
    sortECLPInputByTokenAddress,
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
    let poolInput: CreatePoolGyroECLPInput;
    let poolInputInvertedParams: CreatePoolGyroECLPInput;
    let poolAddress: Address;
    let poolAddressInvertedParams: Address;

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
        poolInput = {
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
                alpha: parseUnits('2378', 18),
                beta: parseUnits('2906', 18),
                c: parseUnits('0.000378501108390785', 18),
                s: parseUnits('0.999999928368452908', 18),
                lambda: parseUnits('100000', 18),
            },
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: poolInput,
        });

        // flip the token order and calculate the inverted param values (i.e. DAI in terms of WETH)
        const invertedTokens = [poolInput.tokens[1], poolInput.tokens[0]];

        const { eclpParams: invertedEclpParams } = sortECLPInputByTokenAddress({
            tokens: invertedTokens,
            eclpParams: poolInput.eclpParams,
        });

        // use inverted tokens and eclp params to create test pool for comparison
        poolInputInvertedParams = {
            ...poolInput,
            tokens: invertedTokens,
            eclpParams: invertedEclpParams,
        };

        poolAddressInvertedParams = await doCreatePool({
            client,
            testAddress,
            createPoolInput: poolInputInvertedParams,
        });
    }, 120_000);

    test('creation', async () => {
        expect(poolAddress).to.not.be.undefined;
        expect(poolAddressInvertedParams).to.not.be.undefined;
    });

    test('registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('equivalent ECLP params for pool created with inverted input', async () => {
        const eclpParams = await client.readContract({
            address: poolAddress,
            abi: mockGyroEclpPoolAbi_V3,
            functionName: 'getGyroECLPPoolImmutableData',
            args: [],
        });
        const eclpParamsWithInvertedInput = await client.readContract({
            address: poolAddressInvertedParams,
            abi: mockGyroEclpPoolAbi_V3,
            functionName: 'getGyroECLPPoolImmutableData',
            args: [],
        });

        expect(eclpParams).to.deep.equal(eclpParamsWithInvertedInput);
    });

    test('initialization', async () => {
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
});
