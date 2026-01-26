import { AddLiquidityInput } from '@/entities/addLiquidity/types';
import { InputValidatorBase } from '../inputValidatorBase';
import { PoolState, PoolStateWithBalances } from '../../types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import {
    CreatePoolLiquidityBootstrappingInput,
    CreatePoolLiquidityBootstrappingWithMigrationInput,
} from '../../createPool/types';

import { isSameAddress, SDKError } from '@/utils';

export class InputValidatorLiquidityBootstrapping extends InputValidatorBase {
    // TODO
    validateAddLiquidity(
        _addLiquidityInput: AddLiquidityInput,
        _poolState: PoolState,
    ): void {}
    // TODO
    validateRemoveLiquidity(
        _removeLiquidityInput: RemoveLiquidityInput,
        _poolState: PoolState,
    ): void {}
    // TODO
    validateRemoveLiquidityRecovery(
        _removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput,
        _poolStateWithBalances: PoolStateWithBalances,
    ): void {}
    validateCreatePool(
        input:
            | CreatePoolLiquidityBootstrappingInput
            | CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): void {
        // Validate weights for regular LBPs
        const startWeightsSum =
            input.lbpParams.projectTokenStartWeight +
            input.lbpParams.reserveTokenStartWeight;
        if (startWeightsSum !== BigInt(1e18)) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start weights must sum to 100',
            );
        }
        // end weights
        const endWeightsSum =
            input.lbpParams.projectTokenEndWeight +
            input.lbpParams.reserveTokenEndWeight;
        if (endWeightsSum !== BigInt(1e18)) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'End weights must sum to 100',
            );
        }

        // validate start and end times
        if (input.lbpParams.startTimestamp >= input.lbpParams.endTimestamp) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start time must be before end time',
            );
        }
        // cannot be in the past - technically allowed on the sc side.
        // will simply move startTime to now.
        if (
            input.lbpParams.startTimestamp <
            BigInt(Math.floor(Date.now() / 1000))
        ) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start time must be in the future',
            );
        }
        // tokens cannot be the same
        if (
            isSameAddress(
                input.lbpParams.projectToken,
                input.lbpParams.reserveToken,
            )
        ) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Tokens must be different',
            );
        }

        // LBPool inherits from WeightedPool: _MIN_SWAP_FEE_PERCENTAGE = 0.001e16 (0.001%), _MAX_SWAP_FEE_PERCENTAGE = 10e16 (10%)
        const MIN_SWAP_FEE_PERCENTAGE = BigInt(10 ** 13); // 0.001% = 0.001e16 = 1e13
        const MAX_SWAP_FEE_PERCENTAGE = BigInt(10e16); // 10%
        if (input.swapFeePercentage < MIN_SWAP_FEE_PERCENTAGE) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                `Swap fee percentage cannot be less than ${MIN_SWAP_FEE_PERCENTAGE} (0.001%)`,
            );
        }
        if (input.swapFeePercentage > MAX_SWAP_FEE_PERCENTAGE) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                `Swap fee percentage cannot exceed ${MAX_SWAP_FEE_PERCENTAGE} (10%)`,
            );
        }
    }
}
