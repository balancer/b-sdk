// pnpm test -- removeLiquidityNestedV3Signature.integration.test.ts
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
    ChainId,
    CHAINS,
    NestedPoolState,
    PublicWalletClient,
    Token,
    RemoveLiquidityNestedInput,
    RemoveLiquidityNested,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    TokenAmount,
    Slippage,
    PermitHelper,
    // TODO remove once debug finished
    // balancerCompositeLiquidityRouterAbi,
    // vaultAdminAbi_V3,
    // vaultV3Abi,
    // vaultExtensionAbi_V3,
    // permit2Abi,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    POOLS,
    sendTransactionGetBalances,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';
import { RemoveLiquidityNestedCallInputV3 } from '@/entities/removeLiquidityNested/removeLiquidityNestedV3/types';

const chainId = ChainId.SEPOLIA;
const NESTED_WITH_BOOSTED_POOL = POOLS[chainId].NESTED_WITH_BOOSTED_POOL;
const BOOSTED_POOL = POOLS[chainId].MOCK_BOOSTED_POOL;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC = TOKENS[chainId].USDC_AAVE;
const WETH = TOKENS[chainId].WETH;

const parentBptToken = new Token(
    chainId,
    NESTED_WITH_BOOSTED_POOL.address,
    NESTED_WITH_BOOSTED_POOL.decimals,
);
// These are the underlying tokens
const daiToken = new Token(chainId, DAI.address, DAI.decimals);
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const mainTokens = [wethToken, daiToken, usdcToken];

describe.skip('V3 remove liquidity nested test, with Permit signature', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityNested = new RemoveLiquidityNested();

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        // Mint BPT to testAddress
        await setTokenBalances(
            client,
            testAddress,
            [parentBptToken.address],
            [0],
            [parseUnits('10', 18)],
        );
    });

    test('remove liquidity transaction, direct approval on router', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: parseUnits('0.7', 18),
            chainId,
            rpcUrl,
        };
        await approveSpenderOnToken(
            client,
            testAddress,
            parentBptToken.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );

        // TODO - Add this once on Deploy10
        // const queryOutput = await removeLiquidityNested.query(
        //     removeLiquidityInput,
        //     nestedPoolState,
        // );

        // TODO remove once we have real query
        const queryOutput = {
            protocolVersion: 3,
            bptAmountIn: TokenAmount.fromRawAmount(
                parentBptToken,
                removeLiquidityInput.bptAmountIn,
            ),
            amountsOut: mainTokens.map((t) =>
                TokenAmount.fromHumanAmount(t, '0.000000001'),
            ),
            chainId,
            parentPool: parentBptToken.address,
            userData: '0x',
        };

        const removeLiquidityBuildInput = {
            ...queryOutput,
            slippage: Slippage.fromPercentage('1'), // 1%,
        } as RemoveLiquidityNestedCallInputV3;

        const permit = await PermitHelper.signRemoveLiquidityNestedApproval({
            ...removeLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        const addLiquidityBuildCallOutput =
            removeLiquidityNested.buildCallWithPermit(
                removeLiquidityBuildInput,
                permit,
            );

        // TODO - used for debug atm. Remove once deploy10 hopefully fixes things
        // const args = [
        //     [
        //         {
        //             token: '0xee76b8f75e20d4bb9eb483cdec176dfc8d02bb3a',
        //             owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        //             spender: '0x77eDc69766409C599F06Ef0B551a0990CBfe13A7',
        //             amount: 700000000000000000n,
        //             nonce: 0n,
        //             deadline:
        //                 115792089237316195423570985008687907853269984665640564039457584007913129639935n,
        //         },
        //     ],
        //     [
        //         '0xcbe54f21bde6d544980f94a7545b1ec10b2690d1de8ede996a77126b00ce20fc5be8b982ad79d45620631e10d4715dd56673a880fc392314da46f27af4841e901b',
        //     ],
        //     {
        //         details: [],
        //         spender: '0x0000000000000000000000000000000000000000',
        //         sigDeadline: 0n,
        //     },
        //     '0x',
        //     [
        //         '0xcb25ee65000000000000000000000000ee76b8f75e20d4bb9eb483cdec176dfc8d02bb3a00000000000000000000000000000000000000000000000009b6e64a8ec6000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007b79995e5f793a07bc00c21412e50ecae098e7f9000000000000000000000000ff34b3d4aee8ddcd6f9afffb6fe49bd371b8a35700000000000000000000000094a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000003b023380000000000000000000000000000000000000000000000000000000003b02338000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        //     ],
        // ] as const;
        // await client.simulateContract({
        //     address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        //     abi: [
        //         ...balancerCompositeLiquidityRouterAbi,
        //         ...vaultAdminAbi_V3,
        //         ...vaultV3Abi,
        //         ...vaultExtensionAbi_V3,
        //         ...permit2Abi,
        //     ],
        //     functionName: 'permitBatchAndCall',
        //     args,
        // });

        // send remove liquidity transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [
                    queryOutput.bptAmountIn.token.address,
                    ...mainTokens.map((t) => t.address),
                ],
                client,
                testAddress,
                addLiquidityBuildCallOutput.to,
                addLiquidityBuildCallOutput.callData,
            );
        expect(transactionReceipt.status).to.eq('success');
        const expectedDeltas = [
            queryOutput.bptAmountIn.amount,
            ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
        ];
        queryOutput.amountsOut.map(
            (amountOut) => expect(amountOut.amount > 0n).to.be.true,
        );
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
        const expectedMinAmountsOut = queryOutput.amountsOut.map((amountOut) =>
            removeLiquidityBuildInput.slippage.applyTo(amountOut.amount, -1),
        );
        expect(expectedMinAmountsOut).to.deep.eq(
            addLiquidityBuildCallOutput.minAmountsOut.map((a) => a.amount),
        );
    });
});

const _nestedPoolState: NestedPoolState = {
    protocolVersion: 3,
    pools: [
        {
            id: NESTED_WITH_BOOSTED_POOL.id,
            address: NESTED_WITH_BOOSTED_POOL.address,
            type: NESTED_WITH_BOOSTED_POOL.type,
            level: 1,
            tokens: [
                {
                    address: BOOSTED_POOL.address,
                    decimals: BOOSTED_POOL.decimals,
                    index: 0,
                },
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                    index: 1,
                },
            ],
        },
        {
            id: BOOSTED_POOL.id,
            address: BOOSTED_POOL.address,
            type: BOOSTED_POOL.type,
            level: 0,
            tokens: [
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
            ],
        },
    ],
    mainTokens: [
        {
            address: WETH.address,
            decimals: WETH.decimals,
        },
        {
            address: DAI.address,
            decimals: DAI.decimals,
        },
        {
            address: USDC.address,
            decimals: USDC.decimals,
        },
    ],
};
