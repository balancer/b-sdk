// pnpm test test/v2/priceImpact/priceImpactFeIssue.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { parseUnits } from 'viem';

import {
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    Address,
    ChainId,
    getPoolAddress,
    Hex,
    InputAmount,
    PoolState,
    PoolType,
    PriceImpact,
    PriceImpactAmount,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const block = 23739706n;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET, undefined, block);
const chainId = ChainId.MAINNET;

// pool and tokens for add/remove liquidity
const B_wjAura_wETH = POOLS[chainId].B_wjAura_wETH;
const weth = TOKENS[chainId].WETH;
const wjAURA = TOKENS[chainId].wjAura;

describe('price impact', () => {
    let poolState: PoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(B_wjAura_wETH.id);
    });
    describe('add liquidity unbalanced', () => {
        let amountsIn: InputAmount[];
        let input: AddLiquidityUnbalancedInput;
        beforeAll(() => {
            amountsIn = poolState.tokens.map((t, i) => {
                return {
                    rawAmount: i === 0 ? 0n : parseUnits('1', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                };
            });

            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.addLiquidityUnbalanced(
                input,
                poolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.001395038034686279', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-3, // 100 bps
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: wjAURA.address,
                decimals: wjAURA.decimals,
                index: 0,
            },
            {
                address: weth.address,
                decimals: weth.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.Weighted,
            tokens,
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
