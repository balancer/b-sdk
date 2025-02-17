// pnpm test -- addLiquidityPartialBoosted.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    Hex,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';
import {
    Address,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    CHAINS,
    ChainId,
    PERMIT2,
    PublicWalletClient,
    Slippage,
    Token,
    TokenAmount,
    AddLiquidityBoostedV3,
    AddLiquidityKind,
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityBoostedProportionalInput,
} from '@/index';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityBoostedTxInput,
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    assertAddLiquidityBoostedProportional,
    assertAddLiquidityBoostedUnbalanced,
    doAddLiquidityBoosted,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';
import { partialBoostedPool_USDT_USDX_sUSDX } from 'test/mockData/partialBoostedPool';
import { TestToken } from '../../lib/utils/addresses';

const chainId = ChainId.ARBITRUM_ONE;

const userAddress = "0xf76142b79Db34E57852d68F9c52C0E24f7349647";

const USDT = {
    address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    decimals: 6,
    slot: undefined,
} as TestToken;

const USDX = {
    address: '0xf3527ef8de265eaa3716fb312c12847bfba66cef',
    decimals: 18,
    slot: undefined,
} as TestToken;

const sUSDX = {
    address: '0x7788a3538c5fc7f9c7c8a74eac4c898fc8d87d92',
    decimals: 18,
    slot: undefined,
} as TestToken;


// These are the underlying tokens
// const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
// const wethToken = new Token(chainId, WETH.address, WETH.decimals);

const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const usdxToken = new Token(chainId, USDX.address, USDX.decimals);
const susdxToken = new Token(chainId, sUSDX.address, sUSDX.decimals);

describe('V3 add liquidity partial boosted', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;
    const addLiquidityBoosted = new AddLiquidityBoostedV3();
    const amountsIn = [
        TokenAmount.fromHumanAmount(susdxToken, '0.162068101739815138'),
        TokenAmount.fromHumanAmount(usdtToken, '0.169672'),
        TokenAmount.fromHumanAmount(usdxToken, '0.161226056330050479'),

    ];

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];
        // testAddress = "0xf76142b79Db34E57852d68F9c52C0E24f7349647";

        await client.setBalance({ 
            address: testAddress,
            value: parseUnits('1000000000000000000000000', 18)
          })

        console.log(await client.getBalance({ 
            address: testAddress,
          }));

        console.log("testAddress: ", testAddress);

        // fork setup
        await setTokenBalances(
            client,
            testAddress,
            amountsIn.map((t) => t.token.address),
            [sUSDX.slot, USDT.slot, USDX.slot] as number[],
            [parseUnits('0.280798037130211858', sUSDX.decimals), parseUnits('0.169686', USDT.decimals), parseUnits('0.280798037130211858', USDX.decimals)],
        );

        for (const token of partialBoostedPool_USDT_USDX_sUSDX.tokens) {
            // Approve Permit2 to spend account tokens
            await approveSpenderOnToken(
                client,
                testAddress,
                token.underlyingToken?.address ?? token.address,
                PERMIT2[chainId],
            );
            // Approve Router to spend account tokens using Permit2
            await approveSpenderOnPermit2(
                client,
                testAddress,
                token.underlyingToken?.address ?? token.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );
        }

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('proportional', async () => {
        let addLiquidityBoostedInput: AddLiquidityBoostedProportionalInput;
        let referenceTokenAmount: TokenAmount;
        beforeAll(async () => {
            referenceTokenAmount = amountsIn[1];
            addLiquidityBoostedInput = {
                referenceAmount: {
                    address: referenceTokenAmount.token.address,
                    rawAmount: referenceTokenAmount.amount,
                    decimals: referenceTokenAmount.token.decimals,
                },
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                tokensIn: [sUSDX.address, USDT.address, USDX.address],
            };
        });

        test('with tokens', async () => {
            const wethIsEth = false;
            const txInput: AddLiquidityBoostedTxInput = {
                client,
                addLiquidityBoosted,
                addLiquidityBoostedInput,
                testAddress,
                poolStateWithUnderlyings: partialBoostedPool_USDT_USDX_sUSDX,
                slippage: Slippage.fromPercentage('0.5'),
                wethIsEth,
            };

            const {
                addLiquidityBoostedQueryOutput,
                addLiquidityBuildCallOutput,
                tokenAmountsForBalanceCheck,
                txOutput,
            } = await doAddLiquidityBoosted(txInput);

            assertAddLiquidityBoostedProportional(
                {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                },
                wethIsEth,
            );
        });

        test.skip('with native', async () => {
            const wethIsEth = true;

            const txInput: AddLiquidityBoostedTxInput = {
                client,
                addLiquidityBoosted,
                addLiquidityBoostedInput,
                testAddress,
                poolStateWithUnderlyings: partialBoostedPool_USDT_USDX_sUSDX,
                slippage: Slippage.fromPercentage('1'),
                wethIsEth,
            };

            const {
                addLiquidityBoostedQueryOutput,
                addLiquidityBuildCallOutput,
                tokenAmountsForBalanceCheck,
                txOutput,
            } = await doAddLiquidityBoosted(txInput);

            assertAddLiquidityBoostedProportional(
                {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                },
                wethIsEth,
            );
        });
    });
});
