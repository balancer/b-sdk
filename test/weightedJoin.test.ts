// pnpm test -- weightedJoin.test.ts
import { describe, expect, test, beforeAll } from 'vitest';
import {
    JoinInput,
    JoinParser,
    PoolState,
    Token,
    TokenAmount,
} from '../src/entities';
import { ChainId, getPoolAddress } from '../src/utils';
import { Address } from '../src/types';

describe('weighted join test', () => {
    let api: MockApi;
    beforeAll(() => {
        api = new MockApi();
    });
    test('should join', async () => {
        const joins = new JoinParser();
        const poolId = '0xpoolId';
        // Calls API
        const poolFromApi = await api.getPool(poolId);
        const weightedJoin = joins.getJoin(poolFromApi.type);
        const tokenIn = new Token(ChainId.MAINNET, '0xtoken1Addr', 18);
        const queryInput: JoinInput = {
            tokenAmounts: [TokenAmount.fromHumanAmount(tokenIn, '1')],
            chainId: ChainId.MAINNET,
            rpcUrl: '',
        };
        const queryResult = await weightedJoin.query(queryInput, poolFromApi);
        const call = weightedJoin.buildCall({
            ...queryResult,
            slippage: '10',
            sender: '0xsenderAddr',
            recipient: '0xrecipientAddr',
        });
        console.log(call); // Make call
        expect(true).toEqual(true);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Address): Promise<PoolState> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            assets: ['0xtoken1Addr', '0xtoken2Addr'],
        };
    }
}

/******************************************************************************/
