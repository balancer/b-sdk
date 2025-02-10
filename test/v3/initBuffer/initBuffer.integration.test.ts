// pnpm test -- v3/initBuffer/initBuffer.integration.test.ts

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
    Slippage,
    Hex,
    CHAINS,
    ChainId,
    InitBufferInput,
    InitBufferV3,
    Permit2Helper,
    PERMIT2,
    PublicWalletClient,
} from '../../../src';
import { BALANCER_BUFFER_ROUTER } from '@/utils/constantsV3';
import {
    TOKENS,
    sendTransactionGetBalances,
    setTokenBalance,
    approveSpenderOnToken,
    approveSpenderOnPermit2,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { InitBufferBuildCallInput } from '@/entities/initBuffer/types';

const chainId = ChainId.MAINNET;
const USDC = TOKENS[chainId].USDC;
const gearboxUSDC = TOKENS[chainId].gearboxUSDC;

describe('Buffer Init', () => {
    let client: PublicWalletClient & TestActions;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;
    const initBuffer = new InitBufferV3();

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        const accounts = await client.getAddresses();

        testAddress = accounts[0];

        await setTokenBalance(
            client,
            testAddress,
            USDC.address,
            USDC.slot as number,
            parseUnits('100000', USDC.decimals),
        );

        // Approve Permit2 to spend user tokens
        await approveSpenderOnToken(
            client,
            testAddress,
            USDC.address,
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

    describe('permit 2 direct approval', () => {
        beforeEach(async () => {
            // Approve Buffer Router to spend tokens on the users behalf via Permit2
            await approveSpenderOnPermit2(
                client,
                testAddress,
                USDC.address,
                BALANCER_BUFFER_ROUTER[chainId],
            );
        });

        test('init', async () => {
            const initBufferInput: InitBufferInput = {
                chainId,
                rpcUrl,
                underlyingAmountIn: {
                    rawAmount: parseUnits('100', USDC.decimals),
                    decimals: USDC.decimals,
                    address: USDC.address,
                },
                wrappedAmountIn: {
                    rawAmount: parseUnits('0', gearboxUSDC.decimals),
                    decimals: gearboxUSDC.decimals,
                    address: gearboxUSDC.address,
                },
            };
            const initBufferQueryOutput =
                await initBuffer.query(initBufferInput);

            expect(initBufferQueryOutput.wrappedAmountIn.amount).toEqual(
                initBufferInput.wrappedAmountIn.rawAmount,
            );
            expect(initBufferQueryOutput.underlyingAmountIn.amount).toEqual(
                initBufferInput.underlyingAmountIn.rawAmount,
            );
            expect(initBufferQueryOutput.issuedShares > 0n).to.be.true;

            const slippage = Slippage.fromPercentage('1');
            const initBufferBuildCallInput: InitBufferBuildCallInput = {
                ...initBufferQueryOutput,
                slippage,
            };

            const initBufferBuildCallOutput = initBuffer.buildCall(
                initBufferBuildCallInput,
            );

            const tokensForBalanceCheck = [
                initBufferQueryOutput.wrappedAmountIn,
                initBufferQueryOutput.underlyingAmountIn,
            ];

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    tokensForBalanceCheck.map((t) => t.token.address),
                    client,
                    testAddress,
                    initBufferBuildCallOutput.to,
                    initBufferBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            const expectedDeltas = tokensForBalanceCheck.map((t) => t.amount);
            expect(balanceDeltas).to.deep.eq(expectedDeltas);

            expect(initBufferBuildCallOutput.minIssuedShares).to.deep.eq(
                slippage.applyTo(initBufferQueryOutput.issuedShares, -1),
            );
        });
    });

    describe('permit 2 signatures', () => {
        test('init', async () => {
            const initBufferInput: InitBufferInput = {
                chainId,
                rpcUrl,
                underlyingAmountIn: {
                    rawAmount: parseUnits('100', USDC.decimals),
                    decimals: USDC.decimals,
                    address: USDC.address,
                },
                wrappedAmountIn: {
                    rawAmount: parseUnits('0', gearboxUSDC.decimals),
                    decimals: gearboxUSDC.decimals,
                    address: gearboxUSDC.address,
                },
            };

            const initBufferQueryOutput =
                await initBuffer.query(initBufferInput);
            const slippage = Slippage.fromPercentage('1');
            const initBufferBuildInput: InitBufferBuildCallInput = {
                ...initBufferQueryOutput,
                slippage,
            };

            const permit2 = await Permit2Helper.signInitBufferApproval({
                ...initBufferBuildInput,
                client,
                owner: testAddress,
            });

            const initBufferBuildCallOutput = initBuffer.buildCallWithPermit2(
                initBufferBuildInput,
                permit2,
            );

            const tokensForBalanceCheck = [
                initBufferQueryOutput.wrappedAmountIn,
                initBufferQueryOutput.underlyingAmountIn,
            ];

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    tokensForBalanceCheck.map((t) => t.token.address),
                    client,
                    testAddress,
                    initBufferBuildCallOutput.to,
                    initBufferBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            expect(initBufferQueryOutput.wrappedAmountIn.amount).toEqual(
                initBufferInput.wrappedAmountIn.rawAmount,
            );
            expect(initBufferQueryOutput.underlyingAmountIn.amount).toEqual(
                initBufferInput.underlyingAmountIn.rawAmount,
            );
            expect(initBufferQueryOutput.issuedShares > 0n).to.be.true;

            const expectedDeltas = tokensForBalanceCheck.map((t) => t.amount);
            expect(balanceDeltas).to.deep.eq(expectedDeltas);

            expect(initBufferBuildCallOutput.minIssuedShares).to.deep.eq(
                slippage.applyTo(initBufferQueryOutput.issuedShares, -1),
            );
        });
    });
});
