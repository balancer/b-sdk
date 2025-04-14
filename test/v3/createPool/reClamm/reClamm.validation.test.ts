// pnpm test -- createPool/reClamm/reClamm.validation.test.ts

import { parseUnits, zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolReClammInput,
} from 'src';
import { inputValidationError } from '@/utils';
import { TOKENS } from 'test/lib/utils/addresses';

describe('create reclamm pool input validations', () => {
    const chainId = ChainId.SEPOLIA;
    const createPool = new CreatePool();
    let createReClammPoolInput: CreatePoolReClammInput;
    beforeAll(async () => {
        createReClammPoolInput = {
            poolType: PoolType.ReClamm,
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
            chainId,
            protocolVersion: 3,
        };
    });

    test('Should throw error if more than 2 tokens', async () => {
        const tokens: CreatePoolReClammInput['tokens'] = [
            {
                address: TOKENS[chainId].DAI.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].USDC.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].scUSD.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createReClammPoolInput, tokens }),
        ).toThrowError(
            inputValidationError(
                'Create Pool',
                'ReClamm pools support a maximum of 2 tokens',
            ),
        );
    });
});
