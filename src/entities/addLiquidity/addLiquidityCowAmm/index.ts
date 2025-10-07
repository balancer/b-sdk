import { encodeFunctionData } from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { BaseToken } from '@/entities/baseToken';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { poolTypeError, protocolVersionError } from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
    AddLiquidityProportionalInput,
} from '../types';
import {
    calculateProportionalAmountsCowAmm,
    getPoolStateWithBalancesCowAmm,
} from '@/entities/utils';

export class AddLiquidityCowAmm implements AddLiquidityBase {
    async query(
        input: AddLiquidityProportionalInput,
        poolState: PoolState,
        block?: bigint,
    ): Promise<AddLiquidityBaseQueryOutput> {
        // get a single poolState on-chain that will be used to get bptAmount from referenceAmount and then to simulate an add liquidity proportional query
        const poolStateWithBalances = await getPoolStateWithBalancesCowAmm(
            poolState,
            input.chainId,
            input.rpcUrl,
            block,
        );

        // get bptAmount from referenceAmount
        // Note: rounds down in favor of leaving some dust behind instead of taking more amountIn than the user expects
        const { bptAmount: _bptAmount } = calculateProportionalAmountsCowAmm(
            poolStateWithBalances,
            input.referenceAmount,
        );

        // simulate an add liquidity proportional query by exactly replicating smart contract math
        const { tokenAmounts, bptAmount } = calculateProportionalAmountsCowAmm(
            poolStateWithBalances,
            _bptAmount,
        );

        const bptOut = TokenAmount.fromRawAmount(
            new BaseToken(input.chainId, bptAmount.address, bptAmount.decimals),
            bptAmount.rawAmount,
        );
        const amountsIn = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new BaseToken(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        const tokenInIndex = undefined;

        const output: AddLiquidityBaseQueryOutput = {
            to: poolState.id,
            poolType: poolState.type,
            poolId: poolState.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
            chainId: input.chainId,
            protocolVersion: 1,
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        if (input.addLiquidityKind !== AddLiquidityKind.Proportional) {
            throw poolTypeError(
                'Add Liquidity',
                input.poolType,
                'Use Add Liquidity Proportional instead.',
            );
        }
        if (input.wethIsEth) {
            throw poolTypeError(
                'Add Liquidity with native asset (e.g. ETH)',
                input.poolType,
                'Use wrapped native asset instead (e.g. WETH).',
            );
        }

        const amounts = getAmountsCall(input);
        const callData = encodeFunctionData({
            abi: cowAmmPoolAbi,
            functionName: 'joinPool',
            args: [amounts.minimumBpt, amounts.maxAmountsInWithoutBpt],
        });

        return {
            callData,
            to: input.poolId,
            value: 0n,
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityBaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        throw protocolVersionError(
            'buildCallWithPermit2',
            input.protocolVersion,
            'buildCallWithPermit2 is supported on Balancer v3 only.',
        );
    }
}
