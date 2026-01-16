// pnpm test v3/createPool/liquidityBootstrapping/liquidityBootstrappingFixedPrice.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    parseUnits,
    erc20Abi,
    decodeFunctionData,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    PERMIT2,
    InitPool,
    CreatePoolLiquidityBootstrappingFixedPriceInput,
    FixedPriceLBPParams,
    InitPoolInput,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { MAX_UINT256, PublicWalletClient } from '@/utils';
import { vaultExtensionAbi_V3, balancerRouterAbiExtended } from 'src/abi/';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.LiquidityBootstrappingFixedPrice;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const saleStart = BigInt(Math.floor(Date.now() / 1000) + 86400); // now + 1 day
const saleEnd = BigInt(Math.floor(Date.now() / 1000) + 691200); // now + 8 days

describe('create liquidityBootstrapping fixed price pool test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolLiquidityBootstrappingFixedPriceInput;
    let fixedPriceLbpParams: FixedPriceLBPParams;
    let poolAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            10042461n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        fixedPriceLbpParams = {
            owner: testAddress,
            projectToken: BAL.address,
            reserveToken: WETH.address,
            startTimestamp: saleStart,
            endTimestamp: saleEnd,
            projectTokenRate: parseEther('4'), // 1 BAL = 4 WETH
        };

        createPoolInput = {
            protocolVersion: protocolVersion,
            swapFeePercentage: parseUnits('0.01', 18),
            fixedPriceLbpParams,
            symbol: 'FP-LBP',
            chainId: chainId,
            poolType: PoolType.LiquidityBootstrappingFixedPrice,
            poolCreator: testAddress,
        };

        poolAddress = await doCreatePool({
            client,
            createPoolInput,
            testAddress,
        });
    }, 120_000);

    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);

    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: AddressProvider.Vault(chainId),
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    }, 120_000);

    test('Initialization', async () => {
        await setTokenBalances(
            client,
            testAddress,
            [BAL.address],
            [BAL.slot!],
            [parseUnits('10', BAL.decimals)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [BAL.address],
            PERMIT2[chainId],
        );

        await approveTokens(
            client,
            testAddress,
            [BAL.address],
            protocolVersion,
        );

        // Vault registers tokens sorted by address (WETH < BAL)
        const amountsIn = [
            {
                address: WETH.address,
                rawAmount: 0n, // Fixed price LBPs are initialized with only project tokens
                decimals: WETH.decimals,
            },
            {
                address: BAL.address,
                rawAmount: parseUnits('1', BAL.decimals),
                decimals: BAL.decimals,
            },
        ];

        const initPoolInput: InitPoolInput = {
            minBptAmountOut: 0n,
            amountsIn,
            chainId,
            wethIsEth: false,
        };

        // Build pool state with tokens in sorted order (WETH < BAL)
        const poolTokensWithIndices = [
            { ...WETH, index: 0 },
            { ...BAL, index: 1 },
        ];

        const initPool = new InitPool();

        const initPoolBuildOutput = initPool.buildCall(initPoolInput, {
            id: poolAddress,
            address: poolAddress,
            type: poolType,
            protocolVersion: 3,
            tokens: poolTokensWithIndices,
        });

        // Check balances for all tokens in the same order as amountsIn
        // assertInitPool expects balanceDeltas to match the order of initPoolInput.amountsIn
        const tokensForBalanceCheck = initPoolInput.amountsIn.map(
            (a) => a.address,
        );

        const txOutput = await sendTransactionGetBalances(
            tokensForBalanceCheck,
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
