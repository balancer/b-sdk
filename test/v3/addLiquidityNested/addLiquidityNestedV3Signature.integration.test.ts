// pnpm test -- addLiquidityNestedV3Signature.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';
import {
    Address,
    CHAINS,
    ChainId,
    PERMIT2,
    PublicWalletClient,
    Slippage,
    Token,
    TokenAmount,
    AddLiquidityNested,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    Permit2Helper,
} from '@/index';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED } from '@/utils/constantsV3';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    areBigIntsWithinPercent,
    sendTransactionGetBalances,
    setTokenBalances,
} from 'test/lib/utils';
import {
    nestedWithBoostedPool,
    USDC,
    USDT,
    WETH,
} from 'test/mockData/nestedPool';

const chainId = ChainId.SEPOLIA;

// These are the underlying tokens
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const mainTokens = [wethToken, usdtToken, usdcToken];

describe('V3 add liquidity nested test, with Permit2 signature', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const addLiquidityNested = new AddLiquidityNested();

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

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
            mainTokens.map((t) => t.address),
            [WETH.slot, USDT.slot, USDC.slot] as number[],
            mainTokens.map((t) => parseUnits('1000', t.decimals)),
        );
    });

    test('add liquidity transaction', async () => {
        const addLiquidityInput: AddLiquidityNestedInput = {
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('0.001', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: USDC.address,
                    rawAmount: parseUnits('2', USDC.decimals),
                    decimals: USDC.decimals,
                },
            ],
            chainId,
            rpcUrl,
        };

        const queryOutput = (await addLiquidityNested.query(
            addLiquidityInput,
            nestedWithBoostedPool,
        )) as AddLiquidityNestedQueryOutputV3;

        const addLiquidityBuildInput = {
            ...queryOutput,
            slippage: Slippage.fromPercentage('1'), // 1%,
        };

        // Even when using signatures there must be an initial approve by the user to allow Permit2 to spend their tokens
        for (const amount of addLiquidityInput.amountsIn) {
            // Approve Permit2 to spend account tokens
            await approveSpenderOnToken(
                client,
                testAddress,
                amount.address,
                PERMIT2[chainId],
            );
        }

        // Create signature for each token being used to add
        const permit2 = await Permit2Helper.signAddLiquidityNestedApproval({
            ...addLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        const addLiquidityBuildCallOutput =
            addLiquidityNested.buildCallWithPermit2(
                addLiquidityBuildInput,
                permit2,
            );
        expect(addLiquidityBuildCallOutput.value === 0n).to.be.true;
        expect(addLiquidityBuildCallOutput.to).to.eq(
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId],
        );

        // send add liquidity transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [
                    ...mainTokens.map((t) => t.address),
                    queryOutput.bptOut.token.address,
                ],
                client,
                testAddress,
                addLiquidityBuildCallOutput.to,
                addLiquidityBuildCallOutput.callData,
                addLiquidityBuildCallOutput.value,
            );
        expect(transactionReceipt.status).to.eq('success');
        const expectedAmountsIn = [
            TokenAmount.fromHumanAmount(wethToken, '0.001'),
            TokenAmount.fromHumanAmount(usdtToken, '0'),
            TokenAmount.fromHumanAmount(usdcToken, '2'),
        ];

        expect(expectedAmountsIn.map((a) => a.amount)).to.deep.eq(
            balanceDeltas.slice(0, -1),
        );
        // Here we check that output diff is within an acceptable tolerance.
        // !!! This should only be used in the case of buffers as all other cases can be equal
        areBigIntsWithinPercent(
            balanceDeltas[balanceDeltas.length - 1],
            queryOutput.bptOut.amount,
            0.001,
        );
    });
});
