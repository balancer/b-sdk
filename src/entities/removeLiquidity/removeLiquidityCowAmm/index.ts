import { BaseToken } from '@/entities/baseToken';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    calculateProportionalAmountsCowAmm,
    getPoolStateWithBalancesCowAmm,
} from '@/entities/utils';

import { getAmountsCall } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityKind,
    RemoveLiquidityProportionalInput,
} from '../types';
import { encodeFunctionData } from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { poolTypeError, protocolVersionError } from '@/utils';

export class RemoveLiquidityCowAmm implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityProportionalInput,
        poolState: PoolState,
        block?: bigint,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const poolStateWithBalances = await getPoolStateWithBalancesCowAmm(
            poolState,
            input.chainId,
            input.rpcUrl,
            block,
        );

        const { tokenAmounts } = calculateProportionalAmountsCowAmm(
            poolStateWithBalances,
            input.bptIn,
        );

        const bptIn = TokenAmount.fromRawAmount(
            new BaseToken(
                input.chainId,
                input.bptIn.address,
                input.bptIn.decimals,
            ),
            input.bptIn.rawAmount,
        );
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new BaseToken(
                    input.chainId,
                    amountIn.address,
                    amountIn.decimals,
                ),
                amountIn.rawAmount,
            ),
        );

        const output: RemoveLiquidityBaseQueryOutput = {
            to: poolState.id,
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: undefined,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };

        return output;
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        if (input.removeLiquidityKind !== RemoveLiquidityKind.Proportional) {
            throw poolTypeError(
                'Remove Liquidity',
                input.poolType,
                'Use Remove Liquidity Proportional instead.',
            );
        }

        const amounts = getAmountsCall(input);

        const callData = encodeFunctionData({
            abi: cowAmmPoolAbi,
            functionName: 'exitPool',
            args: [amounts.maxBptAmountIn, amounts.minAmountsOut],
        });

        return {
            callData,
            to: input.poolId,
            value: 0n, // remove liquidity always has value = 0
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }

    buildCallWithPermit(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        throw protocolVersionError(
            'buildCallWithPermit',
            input.protocolVersion,
            'buildCallWithPermit is supported on Balancer v3 only.',
        );
    }
}
