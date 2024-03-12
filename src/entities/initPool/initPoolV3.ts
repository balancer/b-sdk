import { balancerRouterAbi } from '@/abi';
import { PoolState } from '../types';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInputV3 } from './types';
import { BALANCER_ROUTER } from '@/utils';
import { encodeFunctionData, Address } from 'viem';
import { getSortedTokens, parseInitializeArgs, getAmounts } from '../utils';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { getValue } from '../utils/getValue';

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

        const amountsIn = input.amountsIn.map((a) => {
            const token = new Token(input.chainId, a.address, a.decimals);
            return TokenAmount.fromRawAmount(token, a.rawAmount);
        });

        return {
            call,
            to: BALANCER_ROUTER[input.chainId] as Address,
            value: getValue(amountsIn, !!input.wethIsEth),
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
}
