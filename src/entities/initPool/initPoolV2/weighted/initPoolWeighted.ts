import { Address, encodeFunctionData } from 'viem';
import { InitPoolAmounts, PoolState } from '../../../types';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInput } from '../../types';
import { BALANCER_VAULT, ZERO_ADDRESS } from '../../../../utils';
import { vaultV2Abi } from '../../../../abi';
import {
    getAmounts,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '../../../utils';
import { Token } from '../../../token';
import { WeightedEncoder } from '../../../encoders';

export class InitPoolWeighted implements InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = this.getAmounts(input, sortedTokens);
        const userData = WeightedEncoder.encodeInitPoolUserData(amounts);
        const { args } = parseAddLiquidityArgs({
            ...input,
            poolId: poolState.id,
            sortedTokens,
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
        });

        const call = encodeFunctionData({
            abi: vaultV2Abi,
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
            maxAmountsIn: getAmounts(poolTokens, input.amountsIn),
        };
    }
}
