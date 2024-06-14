import { InitPoolInput } from '@/entities/initPool';
import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity/types';
import { CreatePoolInput } from '../../createPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../../removeLiquidity/types';
import { PoolState } from '../../types';
import { InputValidatorBase } from '../inputValidatorBase';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';
import {
    addLiquidityProportionalOnlyError,
    removeLiquidityProportionalOnlyError,
} from '@/utils';

export class InputValidatorCowAmm extends InputValidatorBase {
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        throw new Error('Method not implemented.');
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        if (addLiquidityInput.kind !== AddLiquidityKind.Proportional) {
            throw addLiquidityProportionalOnlyError(
                addLiquidityInput.kind,
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        removeLiquidityInput: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        if (removeLiquidityInput.kind !== RemoveLiquidityKind.Proportional) {
            throw removeLiquidityProportionalOnlyError(
                removeLiquidityInput.kind,
                poolState.type,
            );
        }
        validateTokensRemoveLiquidity(removeLiquidityInput, poolState);
    }

    validateCreatePool(input: CreatePoolInput): void {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
