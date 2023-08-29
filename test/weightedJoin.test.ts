// pnpm test -- weightedJoin.test.ts
import { describe, expect, test, beforeAll } from 'vitest';
import {
    JoinHelper,
    JoinInput,
    PoolState,
    Token,
    TokenAmount,
} from '../src/entities';
import { ChainId } from '../src/utils';

describe('weighted join test', () => {
    let api: MockApi;
    beforeAll(() => {
        api = new MockApi();
    });
    test('should join', async () => {
        const joinHelper = new JoinHelper();
        const poolId = '0xpoolId';
        // Calls API
        const poolFromApi = await api.getPool(poolId);
        const join = joinHelper.getJoin(poolFromApi.type);
        const tokenIn = new Token(ChainId.MAINNET, '0xtoken1Addr', 18);
        const queryInput: JoinInput = {
            tokenAmounts: [TokenAmount.fromHumanAmount(tokenIn, '1')],
            chainId: ChainId.MAINNET,
            rpcUrl: '',
        };
        const queryResult = await join.query(queryInput, poolFromApi);
        const call = join.getCall({ ...queryResult, slippage: '10' });
        console.log(call); // Make call
        expect(true).toEqual(true);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: string): Promise<PoolState> {
        return {
            id,
            type: 'Weighted',
            assets: ['0xtoken1Addr', '0xtoken2Addr'],
        };
    }
}

/******************************************************************************/
