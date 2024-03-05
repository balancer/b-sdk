import { areTokensInArray } from '@/entities/utils/areTokensInArray';
import { AddLiquidityInput } from '../../addLiquidity/types';
import { CreatePoolV2ComposableStableInput } from '../../createPool/types';
import { InitPoolInput } from '../../initPool/types';
import { RemoveLiquidityInput } from '../../removeLiquidity/types';
import { PoolState } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateCreatePoolTokens,
    validatePoolHasBpt,
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';

export class InputValidatorComposableStable implements InputValidatorBase {
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        areTokensInArray(
            initPoolInput.amountsIn.map((a) => a.address),
            poolState.tokens.map((t) => t.address),
        );
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        validatePoolHasBpt(poolState);
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        validatePoolHasBpt(poolState);
        validateTokensRemoveLiquidity(input, poolState);
    }

    validateCreatePool(input: CreatePoolV2ComposableStableInput): void {
        validateCreatePoolTokens(input.tokens);
        if (input.tokens.length > 5) {
            throw new Error(
                'Composable stable pools can have a maximum of 5 tokens',
            );
        }
        if (input.amplificationParameter <= BigInt(0)) {
            throw new Error('Amplification parameter must be greater than 0');
        }
        if (input.amplificationParameter > BigInt(5000)) {
            throw new Error(
                'Amplification parameter must be equal or lower than 5000',
            );
        }
        return;
    }
}
