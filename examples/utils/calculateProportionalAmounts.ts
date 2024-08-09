/**
 * Example showing how to use calculateProportionalAmounts helper to calculate proportional input amounts.
 *
 * Run with:
 * pnpm example ./examples/utils/calculateProportionalAmounts.ts
 */
import {
    BalancerApi,
    API_ENDPOINT,
    calculateProportionalAmounts,
    InputAmount,
    ChainId,
} from '../../src';

const calculateProportionalAmountsExample = async () => {
    const chainId = ChainId.MAINNET;
    const poolDataProvider = new BalancerApi(API_ENDPOINT, chainId);
    const poolId =
        '0xf01b0684c98cd7ada480bfdf6e43876422fa1fc10002000000000000000005de'; // Gyroscope ECLP wstETH/wETH
    const pool =
        await poolDataProvider.pools.fetchPoolStateWithBalances(poolId);
    const inputAmount: InputAmount = {
        rawAmount: 149277708680793000n,
        address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
        decimals: 18,
    };
    const { tokenAmounts, bptAmount } = calculateProportionalAmounts(
        pool,
        inputAmount,
    );
    console.log(
        `Token Addresses:     ${tokenAmounts.map(({ address }) => address)}`,
    );
    console.log(
        `Proportional Amounts:${tokenAmounts.map(
            ({ rawAmount }) => rawAmount,
        )}`,
    );
    console.log(`BPT Out:             ${bptAmount.rawAmount}`);
};

export default calculateProportionalAmountsExample;
