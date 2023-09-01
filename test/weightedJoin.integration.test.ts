// pnpm test -- weightedJoin.integration.test.ts
import { describe, expect, test, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    JoinInput,
    JoinParser,
    PoolState,
    Token,
    TokenAmount,
} from '../src/entities';
import { CHAINS, ChainId, MAX_UINT256, getPoolAddress } from '../src/utils';
import { Address } from '../src/types';
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
import { erc20Abi } from '../src/abi';
import { sendTransactionGetBalances } from './lib/utils/helper';

const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig

describe('weighted join test', () => {
    let api: MockApi;
    let chainId: ChainId;
    let rpcUrl: string;
    let blockNumber: bigint;
    let client: Client & PublicActions & TestActions & WalletActions;

    beforeAll(async () => {
        api = new MockApi();
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

        await client.reset({
            blockNumber,
            jsonRpcUrl:
                process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
        });

        await client.impersonateAccount({ address: testAddress });
    });
    test('should join', async () => {
        const poolId =
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
        // Calls API
        const poolFromApi = await api.getPool(poolId);
        const joinParser = new JoinParser();
        const weightedJoin = joinParser.getJoin(poolFromApi.type);
        const tokenInRaw = poolFromApi.tokens[0];
        const tokenIn = new Token(
            chainId,
            tokenInRaw.address,
            tokenInRaw.decimals,
        );
        const queryInput: JoinInput = {
            tokenAmounts: [TokenAmount.fromHumanAmount(tokenIn, '1')],
            chainId,
            rpcUrl,
        };
        const queryResult = await weightedJoin.query(queryInput, poolFromApi);

        const { call, to, value } = weightedJoin.buildCall({
            ...queryResult,
            slippage: '10',
            sender: testAddress,
            recipient: testAddress,
        });

        // approve token on the vault
        await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [to, MAX_UINT256],
        });

        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [...queryResult.assets, queryResult.bptOut.token.address],
                client,
                testAddress,
                to,
                call,
                value,
            );

        console.log('result', balanceDeltas);

        expect(transactionReceipt.status).to.eq('success');
        expect(queryResult.bptOut.amount > 0n).to.be.true;
        const expectedDeltas = [
            ...queryResult.amountsIn.map((a) => a.amount),
            queryResult.bptOut.amount,
        ];
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Address): Promise<PoolState> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
                    decimals: 18,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                    decimals: 18,
                },
            ],
        };
    }
}

/******************************************************************************/
