import {
    AddLiquidityInput,
    AddLiquidityKind,
} from '@/entities/addLiquidity/types';
import { PoolState } from '@/entities/types';
import { addLiquidityPoolTypeError } from '@/utils';
import { InputValidatorBase } from '../inputValidatorBase';
import { validateTokensAddLiquidity } from '../utils/validateTokens';
import { CreatePoolV3StableInput } from '@/entities/createPool';

export const MAX_AMP = 5000n;
export const MIN_AMP = 1n;
export const MAX_TOKENS = 5;
export class InputValidatorStable extends InputValidatorBase {
    validateCreatePool(input: CreatePoolV3StableInput) {
        super.validateCreatePool(input);

        if (input.tokens.length > MAX_TOKENS) {
            throw new Error(
                `Stable pools can only have a maximum of ${MAX_TOKENS} tokens`,
            );
        }

        if (input.amplificationParameter < MIN_AMP) {
            throw new Error(
                `Amplification parameter below minimum of ${MIN_AMP}`,
            );
        }
        if (input.amplificationParameter > MAX_AMP) {
            throw new Error(
                `Amplification parameter above maximum of ${MAX_AMP}`,
            );
        }
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        if (
            poolState.protocolVersion === 2 &&
            addLiquidityInput.kind === AddLiquidityKind.Proportional
        ) {
            throw addLiquidityPoolTypeError(
                addLiquidityInput.kind,
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }
}
