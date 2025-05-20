// pnpm test -- inputValidator.test.ts
import { AddLiquidityInput, PoolState } from '@/entities';
import { InputValidator } from '@/entities/inputValidator/inputValidator';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { ChainId } from '@/utils/constants';
import { describe, expect, test } from 'vitest';

import { balancerV3Contracts } from '@/utils';

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

    test('BatchRouter should return address for MAINNET (chainId 1)', () => {
        expect(() => {
            const address = AddressProvider.BatchRouter(ChainId.MAINNET);
            expect(address).toMatch(
                balancerV3Contracts.BatchRouter[ChainId.MAINNET],
            );
        }).not.toThrow();
    });

    test('BatchRouter should throw for non-existent chainId (chainId 2)', () => {
        expect(() => {
            AddressProvider.BatchRouter(2 as ChainId);
        }).toThrowError(/Address not found for BatchRouter on chainId: 2/);
    });
});
