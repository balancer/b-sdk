import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '@/entities/removeLiquidity/types';
import { InitPoolInput, InitPoolInputV3 } from '../initPool/types';
import { CreatePoolInput } from '../createPool/types';
import { PoolState } from '../types';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
    validateTokensRemoveLiquidityRecovery,
} from './utils/validateTokens';
import { AddLiquidityInput } from '@/entities/addLiquidity/types';
import { areTokensInArray } from '@/entities/utils/areTokensInArray';
import { isSameAddress, NATIVE_ASSETS, inputValidationError } from '@/utils';

export class InputValidatorBase {
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        areTokensInArray(
            'Init Pool',
            initPoolInput.amountsIn.map((a) => a.address),
            poolState.tokens.map((t) => t.address),
        );
        if (poolState.protocolVersion === 3) {
            this.validateWethIsEth(initPoolInput as InitPoolInputV3);
        }
    }

    validateCreatePool(_input: CreatePoolInput) {}

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        validateTokensRemoveLiquidity(input, poolState);
    }

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): void {
        validateTokensRemoveLiquidityRecovery(input, poolState);
    }

    validateWethIsEth(initPoolInput: InitPoolInputV3) {
        if (initPoolInput.wethIsEth) {
            const inputContainsWrappedNativeAsset =
                initPoolInput.amountsIn.some((a) =>
                    isSameAddress(
                        a.address,
                        NATIVE_ASSETS[initPoolInput.chainId].wrapped,
                    ),
                );
            if (!inputContainsWrappedNativeAsset) {
                throw inputValidationError(
                    'Init Pool',
                    'wethIsEth requires wrapped native asset as input',
                );
            }
        }
    }
}
