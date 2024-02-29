// pnpm test -- priceImpact/priceImpact.alternative.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { parseEther } from 'viem';

import {
    AddLiquidity,
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
    priceImpactABA,
    PriceImpactAmount,
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const { rpcUrl } = await startFork(
    ANVIL_NETWORKS.MAINNET,
    undefined,
    18559730n,
);
const chainId = ChainId.MAINNET;

// pool and tokenn
const wstETH = TOKENS[chainId].wstETH;
const rETH = TOKENS[chainId].rETH;
const sfrxETH = TOKENS[chainId].sfrxETH;
const wstETH_rETH_sfrxETH = POOLS[chainId].wstETH_rETH_sfrxETH;

describe('price impact', () => {
    let poolState: PoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(wstETH_rETH_sfrxETH.id);
    });

    describe('add liquidity unbalanced', () => {
        let amountsIn: InputAmount[];
        let input: AddLiquidityUnbalancedInput;
        beforeAll(() => {
            const amounts = ['0', '1000', '10', '1'].map((a) => parseEther(a));
            amountsIn = poolState.tokens.map((t, i) => {
                return {
                    rawAmount: amounts[i],
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
            const priceImpactAlternative =
                await addLiquidityUnbalancedAlternative(input, poolState);
            expect(priceImpactABA.decimal).closeTo(
                priceImpactAlternative.decimal,
                1e-4, // 1 bps
            );
        });
    });
});

/**
 * Alternative for calculating price impact on add liquidity unbalanced operations.
 * It follows more precisely the ABA method, so in principle it's a good way to
 * validate the main (more generic) approach.
 *
 * Note: works on balancer v2 only because it relies on Remove Liquidity Unbalanced
 * @param input same input used in the corresponding add liquidity operation
 * @param poolState same pool state used in the corresponding add liquidity operation
 * @returns price impact amount
 */
const addLiquidityUnbalancedAlternative = async (
    input: AddLiquidityUnbalancedInput,
    poolState: PoolState,
): Promise<PriceImpactAmount> => {
    // inputs are being validated within AddLiquidity
    if (poolState.vaultVersion !== 2) {
        throw new Error(
            'This alternative method relies on Remove Liquidity Unbalanced, which is only available for balancer V2.',
        );
    }

    // simulate adding liquidity to get amounts in and bptOut
    const addLiquidity = new AddLiquidity();
    const { amountsIn, bptOut } = await addLiquidity.query(input, poolState);

    // simulate removing liquidity exact out to get bptIn
    const removeLiquidity = new RemoveLiquidity();
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId: input.chainId,
        rpcUrl: input.rpcUrl,
        amountsOut: amountsIn.map((a) => a.toInputAmount()),
        kind: RemoveLiquidityKind.Unbalanced,
    };
    const { bptIn } = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    // calculate price impact using ABA method
    return priceImpactABA(bptIn, bptOut);
};

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: getPoolAddress(id) as Address,
                decimals: 18,
                index: 0,
            },
            {
                address: wstETH.address,
                decimals: wstETH.decimals,
                index: 1,
            },
            {
                address: sfrxETH.address,
                decimals: sfrxETH.decimals,
                index: 2,
            },
            {
                address: rETH.address,
                decimals: rETH.decimals,
                index: 2,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.ComposableStable,
            tokens,
            vaultVersion: 2,
        };
    }
}

/******************************************************************************/
