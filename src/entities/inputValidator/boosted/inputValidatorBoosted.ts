import { PoolStateWithUnderlyings } from '@/entities/types';
import { InputValidatorBase } from '../inputValidatorBase';
import { AddLiquidityKind } from '@/entities/addLiquidity/types';
import { AddLiquidityBoostedInput } from '@/entities/addLiquidityBoosted/types';

export class InputValidatorBoosted extends InputValidatorBase {
    validateAddLiquidityBoosted(
        addLiquidityInput: AddLiquidityBoostedInput,
        poolState: PoolStateWithUnderlyings,
    ): void {
        //check if poolState.protocolVersion is 3
        if (poolState.protocolVersion !== 3) {
            throw new Error('protocol version must be 3');
        }

        if (addLiquidityInput.kind === AddLiquidityKind.Unbalanced) {
            // Child tokens are the lower most tokens of the pool, this will be the underlying token if it exists
            const childTokens = poolState.tokens.map((t) => {
                if (t.underlyingToken)
                    return t.underlyingToken.address.toLowerCase();
                return t.address.toLowerCase();
            });
            addLiquidityInput.amountsIn.forEach((a) => {
                if (
                    !childTokens.includes(
                        a.address.toLowerCase() as `0x${string}`,
                    )
                ) {
                    throw new Error(
                        `Address ${a.address} is not contained in the pool's child tokens.`,
                    );
                }
            });
        }
    }
}
