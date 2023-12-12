import { Address, encodeFunctionData } from 'viem';
import { sortTokensByAddress } from '../../../utils/tokens';
import { ComposableStableEncoder } from '../../encoders/composableStable';
import { InitPoolAmountsComposableStable, PoolState } from '../../types';
import { getAmounts, parseAddLiquidityArgs } from '../../utils';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInput } from '../types';
import { vaultAbi } from '../../../abi';
import { BALANCER_VAULT, ZERO_ADDRESS } from '../../../utils';

export class InitPoolComposableStable implements InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        const amounts = this.getAmounts(input, poolState);

        const userData =
            ComposableStableEncoder.encodeInitPoolUserData(amounts);

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
        poolState: PoolState,
    ): InitPoolAmountsComposableStable {
        const sortedTokens = sortTokensByAddress(poolState.tokens);
        const bptIndex = sortedTokens.findIndex(
            (t) => t.address === poolState.address,
        );
        const maxAmountsIn = getAmounts(sortedTokens, [
            ...input.amountsIn.slice(0, bptIndex),
            {
                address: poolState.address,
                decimals: 18,
                rawAmount: BigInt.asUintN(256, BigInt(-1)),
            },
            ...input.amountsIn.slice(bptIndex),
        ]);
        const amountsIn = getAmounts(sortedTokens, [
            ...input.amountsIn.slice(0, bptIndex),
            {
                address: poolState.address,
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
