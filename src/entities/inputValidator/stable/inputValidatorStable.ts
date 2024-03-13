import {
    AddLiquidityInput,
    AddLiquidityKind,
} from '@/entities/addLiquidity/types';
import { InitPoolInput, InitPoolInputV3 } from '@/entities/initPool/types';
import { RemoveLiquidityInput } from '@/entities/removeLiquidity/types';
import { PoolState } from '@/entities/types';
import { areTokensInArray } from '@/entities/utils/areTokensInArray';
import {
    addLiquidityProportionalNotSupportedOnPoolTypeError,
    isSameAddress,
    NATIVE_ASSETS,
} from '@/utils';

import { InputValidatorBase } from '../types';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';
import { CreatePoolInput } from '@/entities/createPool';

export class InputValidatorStable implements InputValidatorBase {
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        areTokensInArray(
            initPoolInput.amountsIn.map((a) => a.address),
            poolState.tokens.map((t) => t.address),
        );
        if (poolState.vaultVersion === 3) {
            this.validateWethIsEth(initPoolInput as InitPoolInputV3);
        }
    }

    validateCreatePool(_: CreatePoolInput): void {
        throw new Error('Create pool not supported for this pool type');
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        if (addLiquidityInput.kind === AddLiquidityKind.Proportional) {
            throw addLiquidityProportionalNotSupportedOnPoolTypeError(
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        validateTokensRemoveLiquidity(input, poolState);
    }

    private validateWethIsEth(initPoolInput: InitPoolInputV3) {
        if (initPoolInput.wethIsEth) {
            const inputContainsWrappedNativeAsset =
                initPoolInput.amountsIn.some((a) =>
                    isSameAddress(
                        a.address,
                        NATIVE_ASSETS[initPoolInput.chainId].wrapped,
                    ),
                );
            if (!inputContainsWrappedNativeAsset) {
                throw new Error(
                    'wethIsEth requires wrapped native asset as input',
                );
            }
        }
    }
}
