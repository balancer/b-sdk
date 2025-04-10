import {
    AddLiquidityInput,
    AddLiquidityKind,
} from '@/entities/addLiquidity/types';
import { PoolState } from '@/entities/types';
import { inputValidationError, poolTypeError } from '@/utils';
import { InputValidatorBase } from '../inputValidatorBase';
import { validateTokensAddLiquidity } from '../utils/validateTokens';
import { CreatePoolV3StableInput } from '@/entities/createPool';
import { STABLE_POOL_CONSTRAINTS } from '@/utils/constantsV3';

const { MAX_TOKENS, MIN_AMP, MAX_AMP } = STABLE_POOL_CONSTRAINTS;

import { validateCreatePoolTokens } from '../utils/validateTokens';
import { validateCreatePoolTokenConfig } from '../utils/validateCreatePoolTokenConfig';

export class InputValidatorStable extends InputValidatorBase {
    validateCreatePool(input: CreatePoolV3StableInput) {
        validateCreatePoolTokens(input.tokens);
        validateCreatePoolTokenConfig(input);

        if (input.tokens.length > MAX_TOKENS) {
            throw inputValidationError(
                'Create Pool',
                `Stable pools can only have a maximum of ${MAX_TOKENS} tokens on Balancer v3`,
            );
        }
        if (input.amplificationParameter < MIN_AMP) {
            throw inputValidationError(
                'Create Pool',
                `Amplification parameter below minimum of ${MIN_AMP} on Balancer v3`,
            );
        }
        if (input.amplificationParameter > MAX_AMP) {
            throw inputValidationError(
                'Create Pool',
                `Amplification parameter above maximum of ${MAX_AMP} on Balancer v3`,
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
            throw poolTypeError(
                `Add Liquidity ${addLiquidityInput.kind}`,
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }
}
