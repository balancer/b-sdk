// pnpm test -- v3/addLiquidity.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    Client,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    PublicActions,
    TestActions,
    walletActions,
    WalletActions,
} from 'viem';

import {
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityProportionalInput,
    AddLiquidityKind,
    Slippage,
    Hex,
    PoolState,
    CHAINS,
    ChainId,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    PoolType,
    PERMIT2,
} from '../../src';
import {
    AddLiquidityTxInput,
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
    assertAddLiquidityProportional,
    doAddLiquidity,
    POOLS,
    TOKENS,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
} from '../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.id;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('add liquidity test', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let tokens: Address[];
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

        const testAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput: {} as AddLiquidityInput,
        };

        tokens = [...poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('permit2 direct approval', () => {
        beforeEach(async () => {
            await approveTokens(
                client,
                txInput.testAddress,
                tokens,
                protocolVersion,
            );
        });

        describe('add liquidity unbalanced', () => {
            let addLiquidityInput: AddLiquidityUnbalancedInput;
            beforeAll(() => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    kind: AddLiquidityKind.Unbalanced,
                    amountsIn: txInput.poolState.tokens.map((t) => ({
                        rawAmount: parseUnits('0.01', t.decimals),
                        decimals: t.decimals,
                        address: t.address,
                    })),
                };
            });
            test('token inputs', async () => {
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                });
                assertAddLiquidityUnbalanced(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                    wethIsEth,
                });
                assertAddLiquidityUnbalanced(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });

        describe('add liquidity single asset', () => {
            let addLiquidityInput: AddLiquiditySingleTokenInput;
            beforeAll(() => {
                const tokenIn = WETH.address;
                addLiquidityInput = {
                    tokenIn,
                    chainId,
                    rpcUrl,
                    kind: AddLiquidityKind.SingleToken,
                    bptOut: {
                        rawAmount: parseUnits('0.01', 18),
                        decimals: 18,
                        address: poolState.address,
                    },
                };
            });
            test('with token', async () => {
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                });

                assertAddLiquiditySingleToken(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                    wethIsEth,
                });

                assertAddLiquiditySingleToken(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });
        describe('add liquidity proportional', () => {
            let addLiquidityInput: AddLiquidityProportionalInput;
            describe('with bptOut as referenceAmount', () => {
                beforeAll(() => {
                    const referenceAmount: InputAmount = {
                        rawAmount: parseUnits('1', 18),
                        decimals: 18,
                        address: poolState.address,
                    };

                    addLiquidityInput = {
                        referenceAmount,
                        kind: AddLiquidityKind.Proportional,
                        chainId: chainId,
                        rpcUrl: rpcUrl,
                    };
                });
                test('with token', async () => {
                    // call the addLiquidity function
                    // assert the output
                    const addLiquidityOutput = await doAddLiquidity({
                        ...txInput,
                        addLiquidityInput,
                    });

                    assertAddLiquidityProportional(
                        txInput.poolState,
                        addLiquidityInput,
                        addLiquidityOutput,
                        txInput.slippage,
                        protocolVersion,
                    );
                });
                test('with native', async () => {
                    // call the addLiquidity function
                    // assert the output
                    const wethIsEth = true;
                    const addLiquidityOutput = await doAddLiquidity({
                        ...txInput,
                        addLiquidityInput,
                        wethIsEth,
                    });

                    assertAddLiquidityProportional(
                        txInput.poolState,
                        addLiquidityInput,
                        addLiquidityOutput,
                        txInput.slippage,
                        protocolVersion,
                        wethIsEth,
                    );
                });
            });
            describe.only('with amountIn as referenceAmount', () => {
                beforeAll(() => {
                    const token = txInput.poolState.tokens[0];
                    const referenceAmount: InputAmount = {
                        rawAmount: parseUnits('0.01', token.decimals),
                        decimals: token.decimals,
                        address: token.address,
                    };

                    addLiquidityInput = {
                        referenceAmount,
                        kind: AddLiquidityKind.Proportional,
                        chainId: chainId,
                        rpcUrl: rpcUrl,
                    };
                });
                test('with token', async () => {
                    const addLiquidityOutput = await doAddLiquidity({
                        ...txInput,
                        addLiquidityInput,
                    });

                    assertAddLiquidityProportional(
                        txInput.poolState,
                        addLiquidityInput,
                        addLiquidityOutput,
                        txInput.slippage,
                        protocolVersion,
                    );
                });
                test('with native', async () => {
                    const wethIsEth = true;
                    const addLiquidityOutput = await doAddLiquidity({
                        ...txInput,
                        addLiquidityInput,
                        wethIsEth,
                    });

                    assertAddLiquidityProportional(
                        txInput.poolState,
                        addLiquidityInput,
                        addLiquidityOutput,
                        txInput.slippage,
                        protocolVersion,
                        wethIsEth,
                    );
                });
            });
        });
    });

    describe('permit2 signatures', () => {
        beforeEach(async () => {
            txInput = {
                ...txInput,
                usePermit2Signatures: true,
            };
        });
        describe('add liquidity unbalanced', () => {
            let addLiquidityInput: AddLiquidityUnbalancedInput;
            beforeAll(() => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    kind: AddLiquidityKind.Unbalanced,
                    amountsIn: txInput.poolState.tokens.map((t) => ({
                        rawAmount: parseUnits('0.01', t.decimals),
                        decimals: t.decimals,
                        address: t.address,
                    })),
                };
            });
            test('token inputs', async () => {
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                });
                assertAddLiquidityUnbalanced(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                    wethIsEth,
                });
                assertAddLiquidityUnbalanced(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });

        describe('add liquidity single asset', () => {
            let addLiquidityInput: AddLiquiditySingleTokenInput;
            beforeAll(() => {
                const tokenIn = WETH.address;
                addLiquidityInput = {
                    tokenIn,
                    chainId,
                    rpcUrl,
                    kind: AddLiquidityKind.SingleToken,
                    bptOut: {
                        rawAmount: parseUnits('1', 16),
                        decimals: 18,
                        address: poolState.address,
                    },
                };
            });
            test('with token', async () => {
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                });

                assertAddLiquiditySingleToken(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });

            test('with native', async () => {
                const wethIsEth = true;
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                    wethIsEth,
                });

                assertAddLiquiditySingleToken(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
        });
        describe('add liquidity proportional', () => {
            let addLiquidityInput: AddLiquidityProportionalInput;
            beforeAll(() => {
                const referenceAmount: InputAmount = {
                    rawAmount: parseUnits('1', 18),
                    decimals: 18,
                    address: poolState.address,
                };

                addLiquidityInput = {
                    referenceAmount,
                    kind: AddLiquidityKind.Proportional,
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                };
            });
            test('with token', async () => {
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                });

                assertAddLiquidityProportional(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                );
            });
            test('with native', async () => {
                const wethIsEth = true;
                const addLiquidityOutput = await doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                    wethIsEth,
                });

                assertAddLiquidityProportional(
                    txInput.poolState,
                    addLiquidityInput,
                    addLiquidityOutput,
                    txInput.slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
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
