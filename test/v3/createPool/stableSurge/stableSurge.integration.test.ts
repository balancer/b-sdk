// pnpm test -- v3/createPool/stableSurge/stableSurge.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    zeroAddress,
    TestActions,
    parseUnits,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    Permit2Helper,
    PERMIT2,
    InitPool,
    CreatePoolStableSurgeInput,
    balancerV3Contracts,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { PublicWalletClient } from '@/utils';
import { vaultExtensionAbi_V3 } from 'src/abi/';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.StableSurge;
const scUSD = TOKENS[chainId].scUSD;
const scDAI = TOKENS[chainId].scDAI;

describe('create stableSurge pool test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolStableSurgeInput;
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

        createPoolInput = {
            poolType,
            chainId,
            protocolVersion,
            name: 'scUSD scDAI StableSurge Pool',
            symbol: 'scUSD-scDAI',
            amplificationParameter: 420n,
            tokens: [
                {
                    address: scUSD.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: scDAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseEther('0.01'),
            pauseManager: testAddress,
            swapFeeManager: testAddress,
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
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('Initialization', async () => {
        await setTokenBalances(
            client,
            testAddress,
            [scDAI.address, scUSD.address],
            [scDAI.slot!, scUSD.slot!],
            [parseUnits('100', 18), parseUnits('100', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [scDAI.address, scUSD.address],
            PERMIT2[chainId],
        );

        const initPoolInput = {
            amountsIn: [
                {
                    address: scUSD.address,
                    rawAmount: parseUnits('100', scUSD.decimals),
                    decimals: scUSD.decimals,
                },
                {
                    address: scDAI.address,
                    rawAmount: parseUnits('100', scDAI.decimals),
                    decimals: scDAI.decimals,
                },
            ],
            minBptAmountOut: parseEther('10'),
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
                        ...scUSD,
                        index: 0,
                    },
                    {
                        ...scDAI,
                        index: 1,
                    },
                ],
            },
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [scDAI.address, scUSD.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    });
});
