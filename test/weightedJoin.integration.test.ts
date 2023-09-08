// pnpm test -- weightedJoin.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    createTestClient,
    http,
    publicActions,
    PublicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    BaseJoin,
    ExactInJoinInput,
    JoinKind,
    PoolState,
    Slippage,
    Token,
    TokenAmount,
} from '../src/entities';
import { JoinParser } from '../src/entities/join/parser';
import { Address } from '../src/types';
import { CHAINS, ChainId, getPoolAddress } from '../src/utils';

import { approveToken, sendTransactionGetBalances } from './lib/utils/helper';

const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig

describe('weighted join test', () => {
    let api: MockApi;
    let chainId: ChainId;
    let rpcUrl: string;
    let blockNumber: bigint;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Address;
    let poolFromApi: PoolState;
    let tokenIn: Token;
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
        const queryResult = await weightedJoin.query(joinInput, poolFromApi);

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
        const expectedMinBpt = slippage.removeFrom(queryResult.bptOut.amount);
        expect(expectedMinBpt).to.deep.eq(minBptOut);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Address): Promise<PoolState> {
        const tokens = [
            new Token(
                ChainId.MAINNET,
                '0xba100000625a3754423978a60c9317c58a424e3d',
                18,
                'BAL',
            ),
            new Token(
                ChainId.MAINNET,
                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                18,
                'WETH',
            ),
        ];
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            tokens,
        };
    }
}

/******************************************************************************/
