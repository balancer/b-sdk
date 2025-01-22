// pnpm test -- createPool/gyroECLP/gyroECLP.validation.test.ts
import { parseEther, zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolGyroECLPInput,
} from 'src';
import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('create GyroECLP pool input validations', () => {
    const createPool = new CreatePool();
    let createPoolInput: CreatePoolGyroECLPInput;
    beforeAll(async () => {
        createPoolInput = {
            poolType: PoolType.GyroE,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseEther('0.01'),
            poolHooksContract: zeroAddress,
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion: 3,
            enableDonation: false,
            eclpParams: {
                alpha: 1n,
                beta: 1n,
                c: 1n,
                s: 1n,
                lambda: 1n,
            },
            derivedEclpParams: {
                tauAlpha: {
                    x: 1n,
                    y: 1n,
                },
                tauBeta: {
                    x: 1n,
                    y: 1n,
                },
                u: 1n,
                v: 1n,
                w: 1n,
                z: 1n,
                dSq: 1n,
            },
        };
    });

    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolGyroECLPInput['tokens'] = [
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: WETH.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createPoolInput, tokens }),
        ).toThrowError('Duplicate token addresses');
    });
    test('Allowing only TokenType.STANDARD to have address zero as rateProvider', async () => {
        const tokens: CreatePoolGyroECLPInput['tokens'] = [
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: WETH.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.ERC4626_TOKEN,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createPoolInput, tokens }),
        ).toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });
});
