// pnpm test -- v3/addLiquidityBuffer/addLiquidityBuffer.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    erc4626Abi,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    AddLiquidityBufferBuildCallInput,
    AddLiquidityBufferInput,
    AddLiquidityBufferV3,
    Slippage,
    Hex,
    CHAINS,
    ChainId,
    Permit2Helper,
    PERMIT2,
    PublicWalletClient,
} from '../../../src';
import {
    approveSpenderOnTokens,
    approveTokens,
    TOKENS,
    sendTransactionGetBalances,
    setTokenBalance,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { bufferState_USDC_stataUSDC } from 'test/mockData/bufferState';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const stataUSDC = TOKENS[chainId].stataUSDC;

describe('Buffer AddLiquidity', () => {
    let client: PublicWalletClient & TestActions;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;
    const addLiquidityBuffer = new AddLiquidityBufferV3();

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

        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDC.address],
            stataUSDC.address,
        );

        await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataUSDC.address,
            functionName: 'deposit',
            args: [parseUnits('10000', USDC.decimals), testAddress],
        });

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
            // Here We approve the Vault to spend Tokens on the users behalf via Permit2
            await approveTokens(
                client,
                testAddress as Address,
                [USDC.address, stataUSDC.address],
                protocolVersion,
            );
        });

        test('add liquidity', async () => {
            const addLiquidityBufferInput: AddLiquidityBufferInput = {
                chainId,
                rpcUrl,
                exactSharesToIssue: 1000000n,
            };
            const addLiquidityBufferQueryOutput =
                await addLiquidityBuffer.query(
                    addLiquidityBufferInput,
                    bufferState_USDC_stataUSDC,
                );

            expect(addLiquidityBufferQueryOutput.wrappedAmountIn.amount > 0n).to
                .be.true;
            expect(addLiquidityBufferQueryOutput.underlyingAmountIn.amount > 0n)
                .to.be.true;
            expect(addLiquidityBufferQueryOutput.exactSharesToIssue > 0n).to.be
                .true;

            const slippage = Slippage.fromPercentage('1');
            const addLiquidityBufferBuildCallInput: AddLiquidityBufferBuildCallInput =
                {
                    ...addLiquidityBufferQueryOutput,
                    slippage,
                };

            const addLiquidityBufferBuildCallOutput =
                addLiquidityBuffer.buildCall(addLiquidityBufferBuildCallInput);

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        stataUSDC.address as `0x${string}`,
                        USDC.address as `0x${string}`,
                    ],
                    client,
                    testAddress,
                    addLiquidityBufferBuildCallOutput.to,
                    addLiquidityBufferBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            const expectedDeltas = [
                addLiquidityBufferQueryOutput.wrappedAmountIn.amount,
                addLiquidityBufferQueryOutput.underlyingAmountIn.amount,
            ];
            expect(balanceDeltas).to.deep.eq(expectedDeltas);

            expect(
                addLiquidityBufferBuildCallOutput.maxWrappedAmountIn.amount,
            ).to.deep.eq(
                slippage.applyTo(
                    addLiquidityBufferQueryOutput.wrappedAmountIn.amount,
                ),
            );
            expect(
                addLiquidityBufferBuildCallOutput.maxUnderlyingAmountIn.amount,
            ).to.deep.eq(
                slippage.applyTo(
                    addLiquidityBufferQueryOutput.underlyingAmountIn.amount,
                ),
            );
        });
    });

    describe('permit 2 signatures', () => {
        beforeEach(async () => {
            // approve Permit2 to spend users DAI/USDC
            // does not include the sub approvals
            await approveSpenderOnTokens(
                client,
                testAddress,
                [USDC.address, stataUSDC.address],
                PERMIT2[chainId],
            );
        });

        test('add liquidity', async () => {
            const addLiquidityInput: AddLiquidityBufferInput = {
                chainId,
                rpcUrl,
                exactSharesToIssue: 1000000n,
            };

            const addLiquidityBufferQueryOutput =
                await addLiquidityBuffer.query(
                    addLiquidityInput,
                    bufferState_USDC_stataUSDC,
                );
            const slippage = Slippage.fromPercentage('1');
            const addLiquidityBufferBuildInput: AddLiquidityBufferBuildCallInput =
                {
                    ...addLiquidityBufferQueryOutput,
                    slippage,
                };

            const permit2 = await Permit2Helper.signAddLiquidityBufferApproval({
                ...addLiquidityBufferBuildInput,
                client,
                owner: testAddress,
            });

            const addLiquidityBufferBuildCallOutput =
                addLiquidityBuffer.buildCallWithPermit2(
                    addLiquidityBufferBuildInput,
                    permit2,
                );

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [stataUSDC.address, USDC.address],
                    client,
                    testAddress,
                    addLiquidityBufferBuildCallOutput.to,
                    addLiquidityBufferBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            expect(addLiquidityBufferQueryOutput.wrappedAmountIn.amount > 0n).to
                .be.true;
            expect(addLiquidityBufferQueryOutput.underlyingAmountIn.amount > 0n)
                .to.be.true;
            expect(addLiquidityBufferQueryOutput.exactSharesToIssue > 0n).to.be
                .true;

            const expectedDeltas = [
                addLiquidityBufferQueryOutput.wrappedAmountIn.amount,
                addLiquidityBufferQueryOutput.underlyingAmountIn.amount,
            ];
            expect(balanceDeltas).to.deep.eq(expectedDeltas);

            expect(
                addLiquidityBufferBuildCallOutput.maxWrappedAmountIn.amount,
            ).to.deep.eq(
                slippage.applyTo(
                    addLiquidityBufferQueryOutput.wrappedAmountIn.amount,
                ),
            );
            expect(
                addLiquidityBufferBuildCallOutput.maxUnderlyingAmountIn.amount,
            ).to.deep.eq(
                slippage.applyTo(
                    addLiquidityBufferQueryOutput.underlyingAmountIn.amount,
                ),
            );
        });
    });
});
