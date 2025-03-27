// pnpm test -- v3/addLiquidity/addLiquidity.integration-gnosis.test.ts

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
    PERMIT2,
    PublicWalletClient,
} from '@/index';
import {
    AddLiquidityTxInput,
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
    assertAddLiquidityProportional,
    doAddLiquidity,
    TOKENS,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_sDAI_BRLA } from 'test/mockData/boostedPool';

const protocolVersion = 3;

const chainId = ChainId.GNOSIS_CHAIN;

const sDAI = TOKENS[chainId].sDAI;
const BRLA = TOKENS[chainId].BRLA;

describe.skip('add liquidity test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;

    beforeAll(async () => {
        // get pool state from testData
        poolState = boostedPool_sDAI_BRLA;

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
            [sDAI.slot, BRLA.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        await approveTokens(
            client,
            txInput.testAddress,
            tokens,
            protocolVersion,
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
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
            const tokenIn = sDAI.address;
            addLiquidityInput = {
                tokenIn,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleToken,
                bptOut: {
                    rawAmount: parseUnits('1', 18),
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
        describe('with amountIn as referenceAmount', () => {
            beforeAll(() => {
                const token = txInput.poolState.tokens[1];
                const referenceAmount: InputAmount = {
                    rawAmount: parseUnits('1.5', token.decimals),
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
