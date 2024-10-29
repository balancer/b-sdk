// pnpm test -- v3/removeLiquidityBoosted.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    AddLiquidityProportionalInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityProportionalInputWithOptionalUserArgs,
    AddLiquidityKind,
    RemoveLiquidityKind,
    Slippage,
    Hex,
    PoolState,
    PoolStateWithUnderlyings,
    BalancerApi,
    CHAINS,
    ChainId,
    AddLiquidityInput,
    PERMIT2,
    Token,
    PublicWalletClient,
    AddLiquidityBoostedV3,
    RemoveLiquidityBoostedV3,
} from '../../src';
import {
    AddLiquidityTxInput,
    doAddLiquidity,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
} from '../lib/utils';

import { PermitHelper } from 'src';

import { sendTransactionGetBalances } from 'test/lib/utils';
import { assertTokenMatch } from 'test/lib/utils';

import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '../../src';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
// deploy 10
const poolid = '0x6dbdd7a36d900083a5b86a55583d90021e9f33e8';
// const stataUSDC = 0x8a88124522dbbf1e56352ba3de1d9f78c143751e;
const USDC = {
    address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    decimals: 6,
    slot: 0,
};
//const statAUSDT = 0x978206fae13faf5a8d293fb614326b237684b750;
const USDT = {
    address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    decimals: 6,
    slot: 0,
};

describe('remove liquidity test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;

    beforeAll(async () => {
        /* const balancerApi = new BalancerApi(
            'https://test-api-v3.balancer.fi/',
            chainId,
        ); */
        // poolState = await balancerApi.pools.fetchPoolState(poolid);
        // poolStateWithUnderlyings =
        //     await balancerApi.pools.fetchPoolStateWithUnderlyingTokens(poolid);

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [USDT.address, USDC.address] as Address[],
            [USDT.slot, USDC.slot] as number[],
            [
                parseUnits('100', USDT.decimals),
                parseUnits('100', USDC.decimals),
            ],
        );

        // approve Permit2 to spend users DAI/USDC
        // does not include the sub approvals
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDT.address, USDC.address] as Address[],
            PERMIT2[chainId],
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();

        // subapprovals for permit2 to the vault
        // fine to do before each because it does not impact the
        // requirement for BPT permits. (which are permits, not permit2)
        // Here We approve the Vault to spend Tokens on the users behalf via Permit2
        await approveTokens(
            client,
            testAddress as Address,
            [USDT.address, USDC.address] as Address[],
            protocolVersion,
        );

        // join the pool - via direct approval
        const slippage: Slippage = Slippage.fromPercentage('1');

        txInput = {
            client,
            addLiquidity: new AddLiquidityBoostedV3(),
            slippage: slippage,
            poolState: poolStateWithUnderlyings,
            testAddress,
            addLiquidityInput: {} as AddLiquidityInput,
        };

        const input: AddLiquidityProportionalInput = {
            chainId: chainId,
            rpcUrl: rpcUrl,
            referenceAmount: {
                rawAmount: 1000000000000000000n,
                decimals: 18,
                address: poolid as Address,
            },
            kind: AddLiquidityKind.Proportional,
        };

        const _addLiquidityOutput = await doAddLiquidity({
            ...txInput,
            addLiquidityInput: input,
        });
    });
    describe('direct approval', () => {
        beforeEach(async () => {
            // Approve the Composite liquidity router.
            await approveSpenderOnTokens(
                client,
                testAddress,
                [poolid] as Address[],
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );
        });
        test('remove liquidity proportional', async () => {
            const removeLiquidityBoostedV3 = new RemoveLiquidityBoostedV3();

            const removeLiquidityInput: RemoveLiquidityProportionalInputWithOptionalUserArgs =
                {
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                    bptIn: {
                        rawAmount: 1000000000000000000n,
                        decimals: 18,
                        address: poolStateWithUnderlyings.address,
                    },
                    kind: RemoveLiquidityKind.Proportional,
                };

            const removeLiquidityQueryOutput =
                await removeLiquidityBoostedV3.query(
                    removeLiquidityInput,
                    poolStateWithUnderlyings,
                );

            const removeLiquidityBuildInput = {
                ...removeLiquidityQueryOutput,
                slippage: Slippage.fromPercentage('1'),
            };

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoostedV3.buildCall(removeLiquidityBuildInput);

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        poolStateWithUnderlyings.address,
                        USDC.address as `0x${string}`,
                        USDT.address as `0x${string}`,
                    ],
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );
            expect(transactionReceipt.status).to.eq('success');
            expect(
                removeLiquidityQueryOutput.amountsOut.map((amount) => {
                    expect(amount.amount > 0).to.be.true;
                }),
            );

            const expectedDeltas = [
                removeLiquidityQueryOutput.bptIn.amount,
                ...removeLiquidityQueryOutput.amountsOut.map(
                    (amountOut) => amountOut.amount,
                ),
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMinAmountsOut =
                removeLiquidityQueryOutput.amountsOut.map((amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
                );
            expect(expectedMinAmountsOut).to.deep.eq(
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.amount,
                ),
            );

            // make sure to pass Tokens in correct order. Same as poolTokens but as underlyings instead
            assertTokenMatch(
                [
                    new Token(
                        111555111,
                        USDC.address as Address,
                        USDC.decimals,
                    ),
                    new Token(
                        111555111,
                        USDT.address as Address,
                        USDT.decimals,
                    ),
                ],
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.token,
                ),
            );
        });
    });
    describe('permit approval', () => {
        test('remove liquidity proportional', async () => {
            const removeLiquidityBoostedV3 = new RemoveLiquidityBoostedV3();

            const removeLiquidityInput: RemoveLiquidityProportionalInputWithOptionalUserArgs =
                {
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                    bptIn: {
                        rawAmount: 1000000000000000000n,
                        decimals: 18,
                        address: poolStateWithUnderlyings.address,
                    },
                    kind: RemoveLiquidityKind.Proportional,
                    userAddress: testAddress,
                    userData: '0x123',
                };

            const removeLiquidityQueryOutput =
                await removeLiquidityBoostedV3.query(
                    removeLiquidityInput,
                    poolStateWithUnderlyings,
                );

            const removeLiquidityBuildInput = {
                ...removeLiquidityQueryOutput,
                slippage: Slippage.fromPercentage('1'),
            };

            //
            const permit =
                await PermitHelper.signRemoveLiquidityBoostedApproval({
                    ...removeLiquidityBuildInput,
                    client,
                    owner: testAddress,
                });

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoostedV3.buildCallWithPermit(
                    removeLiquidityBuildInput,
                    permit,
                );

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        poolStateWithUnderlyings.address,
                        USDC.address as `0x${string}`,
                        USDT.address as `0x${string}`,
                    ],
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(
                removeLiquidityQueryOutput.amountsOut.map((amount) => {
                    expect(amount.amount > 0).to.be.true;
                }),
            );

            const expectedDeltas = [
                removeLiquidityQueryOutput.bptIn.amount,
                ...removeLiquidityQueryOutput.amountsOut.map(
                    (amountOut) => amountOut.amount,
                ),
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMinAmountsOut =
                removeLiquidityQueryOutput.amountsOut.map((amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
                );
            expect(expectedMinAmountsOut).to.deep.eq(
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.amount,
                ),
            );
            // make sure to pass Tokens in correct order. Same as poolTokens but as underlyings instead
            assertTokenMatch(
                [
                    new Token(
                        111555111,
                        USDC.address as Address,
                        USDC.decimals,
                    ),
                    new Token(
                        111555111,
                        USDT.address as Address,
                        USDT.decimals,
                    ),
                ],
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.token,
                ),
            );
        });
    });

    const poolStateWithUnderlyings: PoolStateWithUnderlyings = {
        id: '0x6dbdd7a36d900083a5b86a55583d90021e9f33e8',
        address: '0x6dbdd7a36d900083a5b86a55583d90021e9f33e8',
        type: 'Stable',
        protocolVersion: 3,
        poolTokens: [
            {
                index: 0,
                address: '0x8a88124522dbbf1e56352ba3de1d9f78c143751e',
                decimals: 6,
                balance: '50000',
                underlyingToken: {
                    address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
                    decimals: 6,
                },
            },
            {
                index: 1,
                address: '0x978206fae13faf5a8d293fb614326b237684b750',
                decimals: 6,
                balance: '50000',
                underlyingToken: {
                    address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
                    decimals: 6,
                },
            },
        ],
        dynamicData: {
            totalShares: '119755.048508537457614083',
        },
        tokens: [
            {
                index: 0,
                address: '0x8a88124522dbbf1e56352ba3de1d9f78c143751e',
                decimals: 6,
                balance: '50000',
                underlyingToken: {
                    address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
                    decimals: 6,
                },
            },
            {
                index: 1,
                address: '0x978206fae13faf5a8d293fb614326b237684b750',
                decimals: 6,
                balance: '50000',
                underlyingToken: {
                    address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
                    decimals: 6,
                },
            },
        ],
        totalShares: '119755.048508537457614083',
    };
});
