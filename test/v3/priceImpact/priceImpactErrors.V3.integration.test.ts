// pnpm test -- priceImpact/priceImpactErrors.V3.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { Address } from 'viem';
import {
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityKind,
    ChainId,
    PriceImpact,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;

describe('PriceImpact Errors V3', () => {
    let rpcUrl: string;
    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));
    });

    test('Expect Error for failing add input', async () => {
        const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
            chainId,
            rpcUrl,
            amountsIn: [
                {
                    rawAmount: 10000000000000000n,
                    decimals: 6,
                    address: USDC.address as Address,
                },
            ],
            kind: AddLiquidityKind.Unbalanced,
            userData: '0x',
        };

        await expect(() =>
            PriceImpact.addLiquidityUnbalancedBoosted(
                addLiquidityInput,
                boostedPool_USDC_USDT,
            ),
        ).rejects.toThrowError(
            'AddLiquidity operation will fail at SC level with user defined input.',
        );
    });
});
