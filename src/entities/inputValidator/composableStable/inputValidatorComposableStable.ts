import { inputValidationError } from '@/utils';
import { AddLiquidityInput } from '../../addLiquidity/types';
import { CreatePoolV2ComposableStableInput } from '../../createPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState, PoolStateWithBalances } from '../../types';
import { InputValidatorBase } from '../inputValidatorBase';
import { validatePoolHasBpt } from '../utils/validateTokens';

export class InputValidatorComposableStable extends InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateAddLiquidity(addLiquidityInput, poolState);
        validatePoolHasBpt('Add Liquidity', poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateRemoveLiquidity(input, poolState);
        validatePoolHasBpt('Remove Liquidity', poolState);
    }

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): void {
        super.validateRemoveLiquidityRecovery(input, poolStateWithBalances);
        validatePoolHasBpt('Remove Liquidity Recovery', poolStateWithBalances);
    }

    validateCreatePool(input: CreatePoolV2ComposableStableInput): void {
        super.validateCreatePool(input);
        if (input.tokens.length > 5) {
            throw inputValidationError(
                'Create Pool',
                'Composable stable pools can have a maximum of 5 tokens on Balancer v2',
            );
        }
        if (input.amplificationParameter <= BigInt(0)) {
            throw inputValidationError(
                'Create Pool',
                'Amplification parameter must be greater than 0 on Balancer v2',
            );
        }
        if (input.amplificationParameter > BigInt(5000)) {
            throw inputValidationError(
                'Create Pool',
                'Amplification parameter must be equal or lower than 5000 on Balancer v2',
            );
        }
        return;
    }
}
