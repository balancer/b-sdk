import { BalancerApi } from '@/data';
import { calculateProportionalAmounts } from '@/entities/utils/calculateProportionalAmounts';
import { InputAmount } from '@/types';
import { ChainId } from '@/utils';
import { TOKENS } from 'test/lib/utils/addresses';

export default async function calculateProportionalAmountsExample() {
    const chainId = ChainId.MAINNET;
    const poolDataProvider = new BalancerApi(
        'https://api-v3.balancer.fi/',
        chainId,
    );
    const poolId =
        '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // Balancer vETH/WETH StablePool
    const pool =
        await poolDataProvider.pools.fetchPoolStateWithRawTokens(poolId);
    const wETH = TOKENS[chainId].WETH;
    const inputAmount: InputAmount = {
        rawAmount: BigInt(1e18),
        address: wETH.address,
        decimals: wETH.decimals,
    };
    const result = calculateProportionalAmounts(pool, inputAmount);
    console.log(`Token Addresses:     ${result.map(({ address }) => address)}`);
    console.log(
        `Proportional Amounts:${result.map(({ rawAmount }) => rawAmount)}`,
    );
}
