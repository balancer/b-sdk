import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity';
import { CreatePoolWeightedInput } from '../../createPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../../removeLiquidity';
import { PoolStateInput } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';

export class InputValidatorGyro implements InputValidatorBase {
    static readonly addLiquidityKindNotSupportedByGyro =
        'INPUT_ERROR: Gyro pools do not implement this add liquidity kind, only Add Liquidity Proportional (3 - ALL_TOKENS_IN_FOR_BPT_OUT) is supported';

    static readonly removeLiquidityKindNotSupportedByGyro =
        'INPUT_ERROR: Gyro pools do not implement this remove liquidity kind, only Remove Liquidity Proportional (1 - EXACT_BPT_IN_FOR_TOKENS_OUT) is supported';

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        if (addLiquidityInput.kind !== AddLiquidityKind.Proportional) {
            throw new Error(
                InputValidatorGyro.addLiquidityKindNotSupportedByGyro,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        removeLiquidityInput: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        if (removeLiquidityInput.kind !== RemoveLiquidityKind.Proportional) {
            throw new Error(
                InputValidatorGyro.removeLiquidityKindNotSupportedByGyro,
            );
        }
        validateTokensRemoveLiquidity(removeLiquidityInput, poolState);
    }

    validateCreatePool(input: CreatePoolWeightedInput): void {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
