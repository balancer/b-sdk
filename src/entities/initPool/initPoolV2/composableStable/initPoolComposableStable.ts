import { Address, encodeFunctionData } from 'viem';
import { ComposableStableEncoder } from '../../../encoders/composableStable';
import { InitPoolAmountsComposableStable, PoolState } from '../../../types';
import {
    getAmounts,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '../../../utils';
import {
    InitPoolBase,
    InitPoolBuildOutput,
    InitPoolInputV2,
} from '../../types';
import { vaultV2Abi } from '../../../../abi';
import { MAX_UINT256 } from '../../../../utils';
import { VAULT_2 } from '@/utils/constantsV2';

import { Token } from '@/entities/token';
import { getValue } from '@/entities/utils/getValue';
import { TokenAmount } from '@/entities/tokenAmount';

export class InitPoolComposableStable implements InitPoolBase {
    buildCall(
        input: InitPoolInputV2,
        poolState: PoolState,
    ): InitPoolBuildOutput {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = this.getAmounts(input, poolState.address, sortedTokens);

        const userData =
            ComposableStableEncoder.encodeInitPoolUserData(amounts);

        const { args } = parseAddLiquidityArgs({
            ...input,
            poolId: poolState.id,
            sortedTokens,
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
            wethIsEth: !!input.wethIsEth,
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
            to: VAULT[input.chainId] as Address,
            value: getValue(amountsIn, !!input.wethIsEth),
        };
    }

    private getAmounts(
        input: InitPoolInputV2,
        poolAddress: Address,
        poolTokens: Token[],
    ): InitPoolAmountsComposableStable {
        const bptIndex = poolTokens.findIndex((t) => t.address === poolAddress);
        const maxAmountsIn = getAmounts(poolTokens, [
            ...input.amountsIn.slice(0, bptIndex),
            {
                address: poolAddress,
                decimals: 18,
                rawAmount: MAX_UINT256,
            },
            ...input.amountsIn.slice(bptIndex),
        ]);
        const amountsIn = getAmounts(poolTokens, [
            ...input.amountsIn.slice(0, bptIndex),
            {
                address: poolAddress,
                decimals: 18,
                rawAmount: BigInt(0),
            },
            ...input.amountsIn.slice(bptIndex),
        ]);
        return {
            maxAmountsIn,
            amountsIn,
        };
    }
}
