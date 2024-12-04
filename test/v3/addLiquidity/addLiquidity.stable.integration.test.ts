// pnpm test -- v3/addLiquidity/addLiquidity.stable.integration.test.ts

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
    PublicWalletClient,
} from '@/index';
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
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_STABLE_POOL.id;

const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;

describe('add liquidity test', () => {
    let client: PublicWalletClient & TestActions;
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
            [USDC.slot, DAI.slot] as number[],
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
                    chainId,
                    protocolVersion,
                );
            });
        });

        describe('add liquidity single asset', () => {
            let addLiquidityInput: AddLiquiditySingleTokenInput;
            beforeAll(() => {
                const tokenIn = USDC.address;
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
                    chainId,
                    protocolVersion,
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
                    const addLiquidityOutput = await doAddLiquidity({
                        ...txInput,
                        addLiquidityInput,
                    });

                    // assert the output
                    assertAddLiquidityProportional(
                        txInput.poolState,
                        addLiquidityInput,
                        addLiquidityOutput,
                        txInput.slippage,
                        chainId,
                        protocolVersion,
                    );
                });
            });
            describe('with amountIn as referenceAmount', () => {
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
                        chainId,
                        protocolVersion,
                    );
                });
            });
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/
class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: USDC.address,
                decimals: USDC.decimals,
                index: 0,
            },
            {
                address: DAI.address,
                decimals: DAI.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Stable,
            tokens,
            protocolVersion,
        };
    }
}

/******************************************************************************/
