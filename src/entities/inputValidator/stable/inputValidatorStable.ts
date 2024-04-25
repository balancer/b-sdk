import {
    AddLiquidityInput,
    AddLiquidityKind,
} from '@/entities/addLiquidity/types';
import { PoolState } from '@/entities/types';
import { addLiquidityProportionalNotSupportedOnPoolTypeError } from '@/utils';
import { InputValidatorBase } from '../inputValidatorBase';
import { validateTokensAddLiquidity } from '../utils/validateTokens';
import { CreatePoolInput } from '@/entities/createPool';

export class InputValidatorStable extends InputValidatorBase {
    validateCreatePool(_: CreatePoolInput): void {
        throw new Error('Create pool not supported for this pool type');
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        if (addLiquidityInput.kind === AddLiquidityKind.Proportional) {
            throw addLiquidityProportionalNotSupportedOnPoolTypeError(
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }
}
