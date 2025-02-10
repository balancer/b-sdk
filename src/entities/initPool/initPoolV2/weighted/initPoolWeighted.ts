import { Address, encodeFunctionData } from 'viem';
import { InitPoolAmounts, PoolState } from '../../../types';
import {
    InitPoolBase,
    InitPoolBuildOutput,
    InitPoolInputV2,
} from '../../types';
import { VAULT_V2 } from '@/utils/constantsV2';
import { vaultV2Abi } from '../../../../abi';
import {
    getAmounts,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '../../../utils';
import { Token } from '../../../token';
import { WeightedEncoder } from '../../../encoders';
import { TokenAmount } from '@/entities/tokenAmount';
import { getValue } from '@/entities/utils/getValue';

export class InitPoolWeighted implements InitPoolBase {
    buildCall(
        input: InitPoolInputV2,
        poolState: PoolState,
    ): InitPoolBuildOutput {
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

        const callData = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'joinPool',
            args,
        });

        const amountsIn = input.amountsIn.map((a) => {
            const token = new Token(input.chainId, a.address, a.decimals);
            return TokenAmount.fromRawAmount(token, a.rawAmount);
        });

        return {
            callData,
            to: VAULT_V2[input.chainId] as Address,
            value: getValue(amountsIn, !!input.wethIsEth),
        };
    }

    private getAmounts(
        input: InitPoolInputV2,
        poolTokens: Token[],
    ): InitPoolAmounts {
        return {
            maxAmountsIn: getAmounts(poolTokens, input.amountsIn),
        };
    }
}
