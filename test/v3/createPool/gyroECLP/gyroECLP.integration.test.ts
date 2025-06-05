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
    let poolInputSortedTokens: CreatePoolGyroECLPInput;
    let poolInputUnsortedTokens: CreatePoolGyroECLPInput;
    let poolFromSortedInput: Address;
    let poolFromUnsortedInput: Address;

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
        const eclpParams = {
            alpha: parseUnits('2378', 18),
            beta: parseUnits('2906', 18),
            c: parseUnits('0.000378501108390785', 18),
            s: parseUnits('0.999999928368452908', 18),
            lambda: parseUnits('100000', 18),
        };

        // Here tokens are numerically sorted already.
        poolInputSortedTokens = {
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
            eclpParams,
        };

        poolFromSortedInput = await doCreatePool({
            client,
            testAddress,
            createPoolInput: poolInputSortedTokens,
        });

        // Here tokens are numerically unsorted. The create function should sort them along with corresponding eclp params.
        poolInputUnsortedTokens = {
            ...poolInputSortedTokens,
            tokens: [poolInputSortedTokens.tokens[1], poolInputSortedTokens.tokens[0]],
            eclpParams: {
                alpha: parseUnits('2906', 18),
                beta: parseUnits('2378', 18),
                c: parseUnits('0.999999928368452908', 18),
                s: parseUnits('0.000378501108390785', 18),
                lambda: parseUnits('100000', 18),
            },
        };

        poolFromUnsortedInput = await doCreatePool({
            client,
            testAddress,
            createPoolInput: poolInputUnsortedTokens,
        });
    }, 120_000);

    test('creation', async () => {
        expect(poolFromSortedInput).to.not.be.undefined;
        expect(poolFromUnsortedInput).to.not.be.undefined;
    });

    test('registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolFromSortedInput],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('pools created with sorted and unsorted input should have the same ECLP params', async () => {
        const eclpParams = await client.readContract({
            address: poolFromSortedInput,
            abi: mockGyroEclpPoolAbi_V3,
            functionName: 'getGyroECLPPoolImmutableData',
            args: [],
        });
        const eclpParamsWithInvertedInput = await client.readContract({
            address: poolFromUnsortedInput,
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
            poolFromSortedInput,
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
