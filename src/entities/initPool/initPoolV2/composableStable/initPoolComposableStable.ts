import { Address, encodeFunctionData } from 'viem';
import { ComposableStableEncoder } from '../../../encoders/composableStable';
import { InitPoolAmountsComposableStable, PoolState } from '../../../types';
import {
    getAmounts,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '../../../utils';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInput } from '../../types';
import { vaultV2Abi } from '../../../../abi';
import { VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../../utils';
import { Token } from '@/entities/token';

export class InitPoolComposableStable implements InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
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
            to: VAULT[input.chainId] as Address,
            value: value === undefined ? 0n : value,
        };
    }

    private getAmounts(
        input: InitPoolInput,
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
