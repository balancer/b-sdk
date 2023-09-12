// pnpm test -- weightedJoin.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    PublicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    BaseJoin,
    ExactInJoinInput,
    ExactOutProportionalJoinInput,
    ExactOutSingleAssetJoinInput,
    JoinKind,
    PoolState,
    Slippage,
    Token,
    TokenAmount,
} from '../src/entities';
import { JoinParser } from '../src/entities/join/parser';
import { Address } from '../src/types';
import { CHAINS, ChainId, getPoolAddress } from '../src/utils';

import {
    approveToken,
    sendTransactionGetBalances,
    setTokenBalance,
} from './lib/utils/helper';

const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig

describe('weighted join test', () => {
    let api: MockApi;
    let chainId: ChainId;
    let rpcUrl: string;
    let blockNumber: bigint;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Address;
    let poolFromApi: PoolState;
    let weightedJoin: BaseJoin;

    beforeAll(async () => {
        // setup mock api
        api = new MockApi();

        // setup chain and test client
        chainId = ChainId.MAINNET;
        rpcUrl = 'http://127.0.0.1:8545/';
        blockNumber = 18043296n;
        client = createTestClient({
            mode: 'hardhat',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);
    });

    beforeEach(async () => {
        // reset local fork
        await client.reset({
            blockNumber,
            jsonRpcUrl: process.env.ETHEREUM_RPC_URL,
        });

        // prepare test client with balance and token approvals
        await client.impersonateAccount({ address: testAddress });

        // get pool state from api
        poolFromApi = await api.getPool(poolId);

        // setup join helper
        const joinParser = new JoinParser();
        weightedJoin = joinParser.getJoin(poolFromApi.type);
    });

    describe('exact in', async () => {
        let tokenIn: Token;

        beforeAll(() => {
            poolId =
                '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
        });

        test('single asset join', async () => {
            tokenIn = new Token(
                chainId,
                '0xba100000625a3754423978a60c9317c58a424e3D',
                18,
                'BAL',
            );
            const amountIn = TokenAmount.fromHumanAmount(tokenIn, '1');

            await approveToken(client, testAddress, tokenIn.address);

            // perform join query to get expected bpt out
            const joinInput: ExactInJoinInput = {
                amountsIn: [amountIn],
                chainId,
                rpcUrl,
                kind: JoinKind.ExactIn,
            };
            const queryResult = await weightedJoin.query(
                joinInput,
                poolFromApi,
            );

            // build join call with expected minBpOut based on slippage
            const slippage = Slippage.fromPercentage('1'); // 1%
            const { call, to, value, minBptOut } = weightedJoin.buildCall({
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            });

            // send join transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        ...queryResult.amountsIn.map((a) => a.token.address),
                        queryResult.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    to,
                    call,
                    value,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(queryResult.bptOut.amount > 0n).to.be.true;
            const expectedDeltas = [
                ...queryResult.amountsIn.map((a) => a.amount),
                queryResult.bptOut.amount,
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMinBpt = slippage.removeFrom(
                queryResult.bptOut.amount,
            );
            expect(expectedMinBpt).to.deep.eq(minBptOut);
        });

        test('native asset join', async () => {
            tokenIn = new Token(
                chainId,
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                18,
                'WETH',
            );
            const amountIn = TokenAmount.fromHumanAmount(tokenIn, '1');

            await approveToken(client, testAddress, tokenIn.address);

            // perform join query to get expected bpt out
            const joinInput: ExactInJoinInput = {
                amountsIn: [amountIn],
                chainId,
                rpcUrl,
                kind: JoinKind.ExactIn,
                joinWithNativeAsset: true,
            };
            const queryResult = await weightedJoin.query(
                joinInput,
                poolFromApi,
            );

            // build join call with expected minBpOut based on slippage
            const slippage = Slippage.fromPercentage('1'); // 1%
            const { call, to, value, minBptOut } = weightedJoin.buildCall({
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            });

            // send join transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        ...queryResult.amountsIn.map((a) => a.token.address),
                        queryResult.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    to,
                    call,
                    value,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(queryResult.bptOut.amount > 0n).to.be.true;
            const expectedDeltas = [
                ...queryResult.amountsIn.map((a) => a.amount),
                queryResult.bptOut.amount,
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMinBpt = slippage.removeFrom(
                queryResult.bptOut.amount,
            );
            expect(expectedMinBpt).to.deep.eq(minBptOut);
        });
    });

    describe('exact out', async () => {
        let tokenOut: Token;

        beforeAll(() => {
            poolId =
                '0x87a867f5d240a782d43d90b6b06dea470f3f8f22000200000000000000000516'; // Balancer 50COMP-50wstETH
            tokenOut = new Token(
                chainId,
                '0x87a867f5d240a782d43d90b6b06dea470f3f8f22',
                18,
                'Balancer 50COMP-50wstETH',
            );
        });

        test('single asset join', async () => {
            const amountOut = TokenAmount.fromHumanAmount(tokenOut, '1');
            const tokenIn = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';

            await approveToken(client, testAddress, tokenIn);
            await setTokenBalance(
                client,
                testAddress,
                tokenIn,
                0,
                parseUnits('100', 18),
            );

            // perform join query to get expected bpt out
            const joinInput: ExactOutSingleAssetJoinInput = {
                bptOut: amountOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: JoinKind.ExactOutSingleAsset,
            };
            const queryResult = await weightedJoin.query(
                joinInput,
                poolFromApi,
            );

            // build join call with expected minBpOut based on slippage
            const slippage = Slippage.fromPercentage('1'); // 1%
            const { call, to, value, maxAmountsIn } = weightedJoin.buildCall({
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            });

            // send join transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        ...queryResult.amountsIn.map((a) => a.token.address),
                        queryResult.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    to,
                    call,
                    value,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(queryResult.bptOut.amount > 0n).to.be.true;
            const expectedDeltas = [
                ...queryResult.amountsIn.map((a) => a.amount),
                queryResult.bptOut.amount,
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMaxAmountsIn = queryResult.amountsIn.map((a) =>
                slippage.applyTo(a.amount),
            );
            expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        });

        test('proportional join', async () => {
            const amountOut = TokenAmount.fromHumanAmount(tokenOut, '1');
            const slots = [0, 1];

            for (let i = 0; i < poolFromApi.tokens.length; i++) {
                const token = poolFromApi.tokens[i];
                await approveToken(client, testAddress, token.address);
                await setTokenBalance(
                    client,
                    testAddress,
                    token.address,
                    slots[i],
                    parseUnits('100', token.decimals),
                );
            }

            // perform join query to get expected bpt out
            const joinInput: ExactOutProportionalJoinInput = {
                bptOut: amountOut,
                chainId,
                rpcUrl,
                kind: JoinKind.ExactOutProportional,
            };
            const queryResult = await weightedJoin.query(
                joinInput,
                poolFromApi,
            );

            // build join call with expected minBpOut based on slippage
            const slippage = Slippage.fromPercentage('1'); // 1%
            const { call, to, value, maxAmountsIn } = weightedJoin.buildCall({
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            });

            // send join transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        ...queryResult.amountsIn.map((a) => a.token.address),
                        queryResult.bptOut.token.address,
                    ],
                    client,
                    testAddress,
                    to,
                    call,
                    value,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(queryResult.bptOut.amount > 0n).to.be.true;
            const expectedDeltas = [
                ...queryResult.amountsIn.map((a) => a.amount),
                queryResult.bptOut.amount,
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMaxAmountsIn = queryResult.amountsIn.map((a) =>
                slippage.applyTo(a.amount),
            );
            expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Address): Promise<PoolState> {
        let tokens: { address: Address; decimals: number }[] = [];
        if (
            id ===
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'
        ) {
            tokens = [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
                    decimals: 18,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // wETH
                    decimals: 18,
                },
            ];
        } else if (
            id ===
            '0x87a867f5d240a782d43d90b6b06dea470f3f8f22000200000000000000000516'
        ) {
            tokens = [
                {
                    address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH slot 0
                    decimals: 18,
                },
                {
                    address: '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP slot 1
                    decimals: 18,
                },
            ];
        }
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            tokens,
        };
    }
}

/******************************************************************************/
