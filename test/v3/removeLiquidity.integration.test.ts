// pnpm test -- v3/removeLiquidity.integration.test.ts
import { config } from 'dotenv';
config();

import {
    Client,
    createTestClient,
    http,
    parseEther,
    parseUnits,
    PublicActions,
    publicActions,
    TestActions,
    WalletActions,
    walletActions,
    parseAbi,
    Address,
    Client,
    PublicActions,
    TestActions,
    WalletActions,
} from 'viem';

import {
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    BALANCER_ROUTER,
    CHAINS,
    VAULT_V3,
    ACTION_IDS_AND_ADMIN,
    AUTHORIZER,
    ChainId,
    Hex,
    InputAmount,
    PoolState,
    PoolType,
    Slippage,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquiditySingleTokenExactOutInput,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityRecoveryInput,
    removeLiquidityUnbalancedNotSupportedOnV3,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    approveSpenderOnToken,
    approveTokens,
    assertRemoveLiquidityProportional,
    assertRemoveLiquiditySingleTokenExactIn,
    assertRemoveLiquiditySingleTokenExactOut,
    assertRemoveLiquidityRecovery,
    doAddLiquidity,
    doRemoveLiquidity,
    POOLS,
    RemoveLiquidityTxInput,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;

const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

// Types
type ExtendedClient = Client & PublicActions & TestActions & WalletActions;

describe('remove liquidity test', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let prepTxInput: AddLiquidityTxInput;
    let txInput: RemoveLiquidityTxInput;
    let poolState: PoolState;
    let rpcUrl: string;
    let snapshot: Hex;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        // get pool state from api
        poolState = await api.getPool(poolId);

        const testAddress = (await client.getAddresses())[0];
        const addLiquidityInput: AddLiquidityUnbalancedInput = {
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: poolState.tokens.map((t) => {
                return {
                    rawAmount: parseUnits('0.01', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                };
            }),
        };

        prepTxInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput,
        };

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };

        // setup by performing an add liquidity so it's possible to remove after that
        const tokens = [...poolState.tokens.map((t) => t.address)];
        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );
        await approveTokens(
            client,
            txInput.testAddress,
            tokens,
            protocolVersion,
        );
        await doAddLiquidity(prepTxInput);

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('permit direct approval', () => {
        beforeEach(async () => {
            await approveSpenderOnToken(
                txInput.client,
                txInput.testAddress,
                txInput.poolState.address,
                BALANCER_ROUTER[chainId],
            );
        });

        describe('unbalanced', async () => {
            let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
            let amountsOut: InputAmount[];
            beforeAll(() => {
                amountsOut = poolState.tokens.map((t) => ({
                    rawAmount: parseUnits('0.01', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                }));
                input = {
                    chainId,
                    rpcUrl,
                    kind: RemoveLiquidityKind.Unbalanced,
                };
            });
            test('must throw remove liquidity kind not supported error', async () => {
                const removeLiquidityInput = {
                    ...input,
                    amountsOut: amountsOut.slice(0, 1),
                };
                await expect(() =>
                    doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
                ).rejects.toThrowError(
                    removeLiquidityUnbalancedNotSupportedOnV3,
                );
            });
        });

        describe('single token exact out', () => {
            let input: RemoveLiquiditySingleTokenExactOutInput;
            beforeAll(() => {
                const amountOut: InputAmount = {
                    rawAmount: parseUnits('0.001', WETH.decimals),
                    decimals: WETH.decimals,
                    address: WETH.address,
                };
                input = {
                    chainId,
                    rpcUrl,
                    amountOut,
                    kind: RemoveLiquidityKind.SingleTokenExactOut,
                };
            });
            test('with wrapped', async () => {
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                });

                assertRemoveLiquiditySingleTokenExactOut(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                    wethIsEth,
                });

                assertRemoveLiquiditySingleTokenExactOut(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });

        describe('single token exact in', () => {
            let input: RemoveLiquiditySingleTokenExactInInput;
            beforeAll(() => {
                const bptIn: InputAmount = {
                    rawAmount: parseEther('0.001'),
                    decimals: 18,
                    address: poolState.address,
                };
                const tokenOut = WETH.address;
                input = {
                    chainId,
                    rpcUrl,
                    bptIn,
                    tokenOut,
                    kind: RemoveLiquidityKind.SingleTokenExactIn,
                };
            });
            test('with wrapped', async () => {
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                });

                assertRemoveLiquiditySingleTokenExactIn(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                    wethIsEth,
                });

                assertRemoveLiquiditySingleTokenExactIn(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });

        describe('proportional', () => {
            let input: RemoveLiquidityProportionalInput;
            beforeAll(() => {
                const bptIn: InputAmount = {
                    rawAmount: parseEther('0.01'),
                    decimals: 18,
                    address: poolState.address,
                };
                input = {
                    bptIn,
                    chainId,
                    rpcUrl,
                    kind: RemoveLiquidityKind.Proportional,
                };
            });
            test('with tokens', async () => {
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                });

                assertRemoveLiquidityProportional(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });
            test('with native', async () => {
                const wethIsEth = true;
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                    wethIsEth,
                });
                assertRemoveLiquidityProportional(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });
    });

    describe('permit signatures', () => {
        beforeEach(async () => {
            txInput = {
                ...txInput,
                usePermitSignatures: true,
            };
        });

        describe('proportional', () => {
            let input: RemoveLiquidityProportionalInput;
            beforeAll(() => {
                const bptIn: InputAmount = {
                    rawAmount: parseEther('0.01'),
                    decimals: 18,
                    address: poolState.address,
                };
                input = {
                    bptIn,
                    chainId,
                    rpcUrl,
                    kind: RemoveLiquidityKind.Proportional,
                };
            });
            test('with tokens', async () => {
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                    usePermitSignatures: true,
                });

                assertRemoveLiquidityProportional(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });
            test('with native', async () => {
                const wethIsEth = true;
                const removeLiquidityOutput = await doRemoveLiquidity({
                    ...txInput,
                    removeLiquidityInput: input,
                    wethIsEth,
                    usePermitSignatures: true,
                });
                assertRemoveLiquidityProportional(
                    txInput.poolState,
                    input,
                    removeLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });
    });
    describe('recovery', () => {
        let input: RemoveLiquidityRecoveryInput;
        beforeEach(async () => {
            // set bptIn
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            // set the input
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Recovery,
            };
            // the pool must be put into recovery mode for the queries & transaction to work
            await putPoolIntoRecoveryMode(
                client,
                txInput.poolState,
                txInput.testAddress,
            );
        });
        test('with tokens', async () => {
            // all preparations are done, now remove liquidity
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });
            // assert now
            assertRemoveLiquidityRecovery(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                protocolVersion,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: WETH.address,
                decimals: WETH.decimals,
                index: 0,
            },
            {
                address: BAL.address,
                decimals: BAL.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Weighted,
            tokens,
            protocolVersion,
        };
    }
}

/******************************************************************************/

/*********************** Helper functions for this test ***********************/
async function putPoolIntoRecoveryMode(
    client: any,
    poolState: PoolState,
    authorizedAddress: Address,
) {
    // grant the testAddress the right to enable Recovery mode for pools
    const { request: grantRoleRequest } = await client.simulateContract({
        address: AUTHORIZER[chainId],
        abi: parseAbi(['function grantRole(bytes32 role, address account)']),
        functionName: 'grantRole',
        args: [
            ACTION_IDS_AND_ADMIN.grantRole.actionId,
            authorizedAddress, // the original test address
        ],
        account: ACTION_IDS_AND_ADMIN.grantRole.admin,
    });

    // the grantRole transaction must be sent by the "grantRole" admin
    await client.impersonateAccount({
        address: ACTION_IDS_AND_ADMIN.grantRole.admin,
    });

    // Do transaction to grand the testAccount the right to put pools into recovery mode
    await client.writeContract(grantRoleRequest);

    await client.stopImpersonatingAccount({
        address: ACTION_IDS_AND_ADMIN.grantRole.admin,
    });

    // Test accounts enabled recovery mode. account is the testAddress
    const { request: enableRecoveryModeRequest } =
        await client.simulateContract({
            address: VAULT_V3[chainId],
            abi: parseAbi(['function enableRecoveryMode(address pool)']),
            functionName: 'enableRecoveryMode',
            args: [poolState.address],
            account: authorizedAddress,
        });
    // put pool into recovery mode
    await client.writeContract(enableRecoveryModeRequest);
}
/******************************************************************************/
