import { PoolStateWithUnderlyings } from '@/entities/types';
import { InputValidatorBase } from '../inputValidatorBase';
import {
    AddLiquidityBoostedWithOptionalInput,
    AddLiquidityKind,
} from '@/entities/addLiquidity/types';

export class InputValidatorBoosted extends InputValidatorBase {
    validateAddLiquidityBoosted(
        addLiquidityInput: AddLiquidityBoostedWithOptionalInput,
        poolState: PoolStateWithUnderlyings,
    ): void {
        //check if poolState.protocolVersion is 3
        if (poolState.protocolVersion !== 3) {
            throw new Error('PoolState protocol version must be 3');
        }

        if (addLiquidityInput.kind === AddLiquidityKind.Unbalanced) {
            if (
                addLiquidityInput.amountsIn.length !== poolState.tokens.length
            ) {
                throw new Error(
                    'AmountsIn length must be equal to tokens length',
                );
            }
            // check if addLiquidityInput.amountsIn.address is contained in poolState.tokens.underlyingToken.address
            const underlyingTokens = poolState.tokens.map(
                (t) => t.underlyingToken.address,
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
