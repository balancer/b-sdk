import { InitPoolInput } from '@/entities/initPool';
import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity/types';
import { CreatePoolInput } from '../../createPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState, PoolStateWithBalances } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
    validateTokensRemoveLiquidityRecovery,
} from '../utils/validateTokens';

export class InputValidatorGyro implements InputValidatorBase {
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        console.log(initPoolInput, poolState);
        throw new Error('Method not implemented.');
    }

    static readonly addLiquidityKindNotSupportedByGyro =
        'INPUT_ERROR: Gyro pools do not implement this add liquidity kind, only Add Liquidity Proportional (3 - ALL_TOKENS_IN_FOR_BPT_OUT) is supported';

    static readonly removeLiquidityKindNotSupportedByGyro =
        'INPUT_ERROR: Gyro pools do not implement this remove liquidity kind, only Remove Liquidity Proportional (1 - EXACT_BPT_IN_FOR_TOKENS_OUT) is supported';

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
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
        poolState: PoolState,
    ): void {
        if (removeLiquidityInput.kind !== RemoveLiquidityKind.Proportional) {
            throw new Error(
                InputValidatorGyro.removeLiquidityKindNotSupportedByGyro,
            );
        }
        validateTokensRemoveLiquidity(removeLiquidityInput, poolState);
    }

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): void {
        validateTokensRemoveLiquidityRecovery(input, poolStateWithBalances);
    }

    validateCreatePool(input: CreatePoolInput): void {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
