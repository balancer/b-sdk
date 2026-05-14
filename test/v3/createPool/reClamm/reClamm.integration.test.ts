// pnpm test v3/createPool/reClamm/reClamm.integration.test.ts
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
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.ReClamm;
// erc20
const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

const reclammPoolAbi = parseAbi([
    'function computeInitialBalancesRaw(address, uint256) view returns (uint256[])',
]);

describe('ReClamm', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;

    // WETH-BAL pool (matches a known-good Sepolia `create` on Etherscan)
    let standardPoolInput: CreatePoolReClammInput;
    let standardPoolAddress: Address;
    let standardPoolState: PoolState;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        // set erc20 token balances with slots
        await setTokenBalances(
            client,
            testAddress,
            [WETH.address, BAL.address],
            [WETH.slot!, BAL.slot!],
            [
                parseUnits('10000', WETH.decimals),
                parseUnits('10000', BAL.decimals),
            ],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [WETH.address, BAL.address],
            PERMIT2[chainId],
        );

        const baseReClammInput = {
            poolType: PoolType.ReClamm as const,
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId,
            protocolVersion: 3 as const,
        };

        standardPoolInput = {
            ...baseReClammInput,
            name: 'DO NOT USE - Mock ReClamm Pool',
            symbol: 'TEST',
            // Omit salt: same tokens/params + salt 0x00 as on-chain pool hits CREATE2 collision
            priceShiftDailyRate: parseUnits('0.01', 18),
            tokens: [
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            priceParams: {
                initialMinPrice: 1_000_000_000_000_000_000_000n,
                initialMaxPrice: 4_000_000_000_000_000_000_000n,
                initialTargetPrice: 2_500_000_000_000_000_000_000n,
                tokenAPriceIncludesRate: false,
                tokenBPriceIncludesRate: false,
            },
        };

        standardPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: standardPoolInput,
        });

        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        standardPoolState = await initPoolDataProvider.getInitPoolData(
            standardPoolAddress,
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

    describe('creation', () => {
        test('address exists', async () => {
            expect(standardPoolAddress).to.not.be.undefined;
        });

        test('pool is registered with Vault', async () => {
            const isPoolRegistered = await client.readContract({
                address: AddressProvider.Vault(chainId),
                abi: vaultExtensionAbi_V3,
                functionName: 'isPoolRegistered',
                args: [standardPoolAddress],
            });
            expect(isPoolRegistered).to.be.true;
        });
    });

    describe('initialization', () => {
        describe('with zero tokens having a rate', () => {
            test('reference: 18 decimal token A', async () => {
                const initAmountsRaw = await client.readContract({
                    address: standardPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [WETH.address, parseUnits('1', WETH.decimals)],
                });

                const amountsIn = standardPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    standardPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, BAL.address],
                    client,
                    testAddress,
                    initPoolBuildOutput.to,
                    initPoolBuildOutput.callData,
                    initPoolBuildOutput.value,
                );

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);

            test('reference: 18 decimal token B', async () => {
                const initAmountsRaw = await client.readContract({
                    address: standardPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [BAL.address, parseUnits('1', BAL.decimals)],
                });

                const amountsIn = standardPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    standardPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, BAL.address],
                    client,
                    testAddress,
                    initPoolBuildOutput.to,
                    initPoolBuildOutput.callData,
                    initPoolBuildOutput.value,
                );

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);
        }, 120_000);
    });
});
