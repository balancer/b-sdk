// pnpm test -- inputValidator.test.ts
import { AddLiquidityInput, PoolState } from '@/entities';
import { InputValidator } from '@/entities/inputValidator/inputValidator';
import { describe, expect, test } from 'vitest';

describe('inputValidator', () => {
    test('should throw when unsupported chain', () => {
        const inputValidator = new InputValidator();
        const addLiqInput = {
            chainId: 777777777,
        } as AddLiquidityInput;
        const poolState = {} as PoolState;

        expect(() => {
            inputValidator.validateAddLiquidity(addLiqInput, poolState);
        }).toThrowError(/^Unsupported chainId: 777777777$/);
    });
});
