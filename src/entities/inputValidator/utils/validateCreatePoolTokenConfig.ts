import {
    CreatePoolV3WeightedInput,
    CreatePoolV3StableInput,
    CreatePoolStableSurgeInput,
    CreatePoolGyroECLPInput,
} from '@/entities/createPool';

import { TokenType } from '@/types';
import { zeroAddress } from 'viem';

export const validateCreatePoolTokenConfig = (
    input:
        | CreatePoolV3WeightedInput
        | CreatePoolV3StableInput
        | CreatePoolStableSurgeInput
        | CreatePoolGyroECLPInput,
) => {
    if (input.protocolVersion === 3) {
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
};
