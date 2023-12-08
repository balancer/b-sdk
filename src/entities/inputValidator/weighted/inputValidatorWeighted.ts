import { AddLiquidityInput } from '../../addLiquidity';
import { CreatePoolInput } from '../../createPool/types';
import { RemoveLiquidityInput } from '../../removeLiquidity';
import { PoolStateInput } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';

export class InputValidatorWeighted implements InputValidatorBase {
    validateCreatePool(input: CreatePoolInput) {
        if (input.tokens.length > 4) {
            throw new Error('Maximum of 4 tokens allowed');
        }
        if (input.tokens.length < 2) {
            throw new Error('Minimum of 2 tokens required');
        }
        const weightsSum = input.tokens.reduce(
            (acc, { weight }) => acc + BigInt(weight),
            0n,
        );
        if (weightsSum !== BigInt(1e18)) {
            throw new Error('Weights must sum to 1e18');
        }
        if (input.tokens.find(({ weight }) => BigInt(weight) === 0n)) {
            throw new Error('Weight cannot be 0');
        }
        const tokenAddresses = input.tokens.map(
            ({ tokenAddress }) => tokenAddress,
        );
        if (
            tokenAddresses.some(
                (address, idx) => tokenAddresses.indexOf(address) !== idx,
            )
        ) {
            throw new Error('Duplicate token addresses');
        }
    }
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }
    
    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        validateTokensRemoveLiquidity(input, poolState);
    }
}
