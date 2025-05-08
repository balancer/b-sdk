// pnpm test -- inputValidator.test.ts
import { AddLiquidityInput, CreatePoolInput, PoolState } from '@/entities';
import { InputValidator } from '@/entities/inputValidator/inputValidator';
import { describe, expect, test } from 'vitest';
import { TokenConfig } from '../src/entities/createPool/types';
import { TokenType } from '@/types';
import { TOKENS } from './lib/utils';
import { zeroAddress, parseUnits } from 'viem';
import { ChainId } from '@/utils';

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
    test('should throw when target address not available', () => {
        const chainId = ChainId.SEPOLIA;
        const invalidChainId = ChainId.OPTIMISM;

        const inputValidator = new InputValidator();
        const createReClammPoolInput = {
            poolType: 'ReClamm',
            name: 'ReClamm Bal Dai',
            symbol: '50BAL-50DAI',
            tokens: [
                {
                    address: TOKENS[chainId].BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: TOKENS[chainId].DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            initialMinPrice: parseUnits('0.5', 18),
            initialMaxPrice: parseUnits('8', 18),
            initialTargetPrice: parseUnits('3', 18),
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId: invalidChainId,
            protocolVersion: 3,
        };

        /* expect(() => {
            inputValidator.validateCreatePool(createPoolInput);
        }).toNotThr() */
        inputValidator.validateCreatePool(createReClammPoolInput);
    });
});
