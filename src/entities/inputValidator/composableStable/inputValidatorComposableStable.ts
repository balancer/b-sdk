import { AddLiquidityInput } from '../../addLiquidity/types';
import { CreatePoolV2ComposableStableInput } from '../../createPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState, PoolStateWithBalances } from '../../types';
import { InputValidatorBase } from '../inputValidatorBase';
import { validatePoolHasBpt } from '../utils/validateTokens';

import { validateCreatePoolTokens } from '../utils/validateTokens';

export class InputValidatorComposableStable extends InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateAddLiquidity(addLiquidityInput, poolState);
        validatePoolHasBpt(poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateRemoveLiquidity(input, poolState);
        validatePoolHasBpt(poolState);
    }

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): void {
        super.validateRemoveLiquidityRecovery(input, poolStateWithBalances);
        validatePoolHasBpt(poolStateWithBalances);
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
