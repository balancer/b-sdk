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
            // List of all tokens that can be added to the pool
            const poolTokens = poolState.tokens
                .flatMap((token) => [
                    token.address,
                    token.underlyingToken?.address,
                ])
                .filter(Boolean);

            addLiquidityInput.amountsIn.forEach((a) => {
                if (
                    !poolTokens.includes(
                        a.address.toLowerCase() as `0x${string}`,
                    )
                ) {
                    throw new Error(
                        `Address ${a.address} is not contained in the pool's parent or child tokens.`,
                    );
                }
            });
        }
    }
}
