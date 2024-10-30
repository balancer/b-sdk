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
            // check if addLiquidityInput.amountsIn.address is contained in poolState.tokens.underlyingToken.address
            const underlyingTokens = poolState.tokens.map((t) =>
                t.underlyingToken.address.toLowerCase(),
            );
            addLiquidityInput.amountsIn.forEach((a) => {
                if (
                    !underlyingTokens.includes(
                        a.address.toLowerCase() as `0x${string}`,
                    )
                ) {
                    throw new Error(
                        `Address ${a.address} is not contained in the pool's underlying tokens.`,
                    );
                }
            });
        }
    }
}
