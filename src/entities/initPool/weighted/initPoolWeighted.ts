import { Address, encodeFunctionData } from 'viem';
import { InitPoolAmounts, PoolState } from '../../types';
import { InitPoolBase, InitPoolInput } from '../types';
import { BALANCER_VAULT, ZERO_ADDRESS } from '../../../utils';
import { sortTokensByAddress } from '../../../utils/tokens';
import { vaultAbi } from '../../../abi';
import { getAmounts, parseAddLiquidityArgs } from '../../utils';
import { Token } from '../../token';
import { WeightedEncoder } from '../../encoders';
import { InitPoolBuildOutput } from '../../addLiquidity';

export class InitPoolWeighted implements InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        const amounts = this.getAmounts(input, poolState.tokens);
        const userData = WeightedEncoder.encodeAddLiquidityUserData(
            input.kind,
            amounts,
        );
        const { args } = parseAddLiquidityArgs({
            ...input,
            poolId: poolState.id,
            sortedTokens: sortTokensByAddress(poolState.tokens),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args,
        });

        const value = input.amountsIn.find(
            (a) => a.address === ZERO_ADDRESS,
        )?.rawAmount;

        return {
            call,
            to: BALANCER_VAULT as Address,
            value: value === undefined ? 0n : value,
        };
    }

    private getAmounts(
        input: InitPoolInput,
        poolTokens: Token[],
    ): InitPoolAmounts {
        return {
            maxAmountsIn: getAmounts(
                sortTokensByAddress(poolTokens),
                input.amountsIn,
            ),
        };
    }
}
