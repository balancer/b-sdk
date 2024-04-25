import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '@/entities/removeLiquidity/types';
import {
    CreatePoolV2ComposableStableInput,
    CreatePoolV2WeightedInput,
    CreatePoolV3WeightedInput,
} from '../createPool/types';
import { InitPoolInput, InitPoolInputV3 } from '../initPool/types';
import { PoolState, PoolStateWithBalances } from '../types';
import {
    validateCreatePoolTokens,
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
    validateTokensRemoveLiquidityRecovery,
} from './utils/validateTokens';
import { TokenType } from '@/types';
import { zeroAddress } from 'viem';
import { AddLiquidityInput } from '@/entities/addLiquidity/types';
import { areTokensInArray } from '@/entities/utils/areTokensInArray';
import { isSameAddress, NATIVE_ASSETS } from '@/utils';

export class InputValidatorBase {
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        areTokensInArray(
            initPoolInput.amountsIn.map((a) => a.address),
            poolState.tokens.map((t) => t.address),
        );
        if (poolState.vaultVersion === 3) {
            this.validateWethIsEth(initPoolInput as InitPoolInputV3);
        }
    }

    validateCreatePool(
        input:
            | CreatePoolV2WeightedInput
            | CreatePoolV3WeightedInput
            | CreatePoolV2ComposableStableInput,
    ) {
        validateCreatePoolTokens(input.tokens);
        if (input.vaultVersion === 3) {
            input.tokens.forEach(({ tokenType, rateProvider }) => {
                if (
                    tokenType !== TokenType.STANDARD &&
                    rateProvider === zeroAddress
                ) {
                    throw new Error(
                        'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
                    );
                }
            });
        }
    }

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
        poolStateWithBalances: PoolStateWithBalances,
    ): void {
        validateTokensRemoveLiquidityRecovery(input, poolStateWithBalances);
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
                throw new Error(
                    'wethIsEth requires wrapped native asset as input',
                );
            }
        }
    }
}
