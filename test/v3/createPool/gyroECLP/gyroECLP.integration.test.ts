// pnpm test -- v3/createPool/gyroECLP/gyroECLP.integration.test.ts
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
    CreatePoolGyroECLPInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    VAULT_V3,
    vaultExtensionAbi_V3,
    PublicWalletClient,
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
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('GyroECLP - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolGyroECLPInput;
    let poolAddress: Address;

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

        await setTokenBalances(
            client,
            testAddress,
            [WETH.address, BAL.address],
            [WETH.slot!, BAL.slot!],
            [parseUnits('100', 18), parseUnits('100', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [WETH.address, BAL.address],
            PERMIT2[chainId],
        );

        createPoolInput = {
            poolType,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: BAL.address,
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
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion,
            enableDonation: false,
            eclpParams: {
                alpha: 1n,
                beta: 1n,
                c: 1n,
                s: 1n,
                lambda: 1n,
            },
            derivedEclpParams: {
                tauAlpha: {
                    x: 1n,
                    y: 1n,
                },
                tauBeta: {
                    x: 1n,
                    y: 1n,
                },
                u: 1n,
                v: 1n,
                w: 1n,
                z: 1n,
                dSq: 1n,
            },
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput,
        });
    });

    test('pool should be created', async () => {
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);

    test('pool should be registered with Vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: VAULT_V3[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    }, 120_000);

    test('pool should init', async () => {
        const initPoolInput = {
            amountsIn: [
                {
                    address: BAL.address,
                    rawAmount: parseEther('100'),
                    decimals: BAL.decimals,
                },
                {
                    address: WETH.address,
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
            {
                id: poolAddress,
                address: poolAddress,
                type: poolType,
                protocolVersion: 3,
                tokens: [
                    {
                        ...BAL,
                        index: 0,
                    },
                    {
                        ...WETH,
                        index: 0,
                    },
                ],
            },
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
    }, 120_000);
});
