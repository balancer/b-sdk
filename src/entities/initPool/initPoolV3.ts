import { balancerRouterAbi } from '@/abi';
import { PoolState } from '../types';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInputV3 } from './types';
import { BALANCER_ROUTER, NATIVE_ASSETS, isSameAddress } from '@/utils';
import { encodeFunctionData, Address } from 'viem';
import { getSortedTokens, parseInitializeArgs, getAmounts } from '../utils';
import { Token } from '../token';

export class InitPoolV3 implements InitPoolBase {
    buildCall(
        input: InitPoolInputV3,
        poolState: PoolState,
    ): InitPoolBuildOutput {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const { exactAmountsIn } = this.getAmounts(input, sortedTokens);
        const { args } = parseInitializeArgs({
            ...input,
            exactAmountsIn,
            poolAddress: poolState.address,
            sortedTokens,
        });

        const call = encodeFunctionData({
            abi: balancerRouterAbi,
            functionName: 'initialize',
            args,
        });

        const value = this.value(input);

        return {
            call,
            to: BALANCER_ROUTER[input.chainId] as Address,
            value,
        };
    }

    private getAmounts(
        input: InitPoolInputV3,
        tokens: Token[],
    ): { exactAmountsIn: bigint[] } {
        return {
            exactAmountsIn: getAmounts(tokens, input.amountsIn),
        };
    }

    private value(input: InitPoolInputV3) {
        return input.wethIsEth
            ? (input.amountsIn.find((a) =>
                  isSameAddress(
                      a.address,
                      NATIVE_ASSETS[input.chainId].wrapped,
                  ),
              )?.rawAmount as bigint)
            : 0n;
    }
}
