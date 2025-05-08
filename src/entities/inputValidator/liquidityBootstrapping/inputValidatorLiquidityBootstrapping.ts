import { AddLiquidityInput } from '@/entities/addLiquidity/types';
import { InputValidatorBase } from '../inputValidatorBase';
import { PoolState, PoolStateWithBalances } from '../../types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { CreatePoolLiquidityBootstrappingInput } from '../../createPool/types';

import { isSameAddress, SDKError } from '@/utils';

import { isOperationSupported } from '@/utils/chainCapabilities';

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
    validateCreatePool(input: CreatePoolLiquidityBootstrappingInput): void {
        if (!isOperationSupported(input.chainId, 'createLBP')) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Chain does not support LBP',
            );
        }
        // start weights
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
        if (input.lbpParams.startTime >= input.lbpParams.endTime) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start time must be before end time',
            );
        }
        // cannot be in the past - technically allowed on the sc side.
        // will simply move startTime to now.
        if (input.lbpParams.startTime < BigInt(Math.floor(Date.now() / 1000))) {
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
    }
}
