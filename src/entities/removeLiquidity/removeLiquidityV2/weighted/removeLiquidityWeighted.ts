import { encodeFunctionData } from 'viem';
import { Token } from '../../../token';
import { TokenAmount } from '../../../tokenAmount';
import { WeightedEncoder } from '../../../encoders/weighted';
import { VAULT, ZERO_ADDRESS } from '../../../../utils/constants';
import { vaultV2Abi } from '../../../../abi';
import { parseRemoveLiquidityArgs } from '../../../utils/parseRemoveLiquidityArgs';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityWeightedCall,
} from '../../types';
import { PoolState } from '../../../types';
import { doRemoveLiquidityQuery } from '../../../utils/doRemoveLiquidityQuery';
import { getSortedTokens } from '../../../utils';
import { getAmountsCall, getAmountsQuery } from '../../helper';

export class RemoveLiquidityWeighted implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        const userData = WeightedEncoder.encodeRemoveLiquidityUserData(
            input.kind === RemoveLiquidityKind.Recovery
                ? RemoveLiquidityKind.Proportional
                : input.kind,
            amounts,
        );

        // tokensOut will have zero address if removing liquidity to native asset
        const { args, tokensOut } = parseRemoveLiquidityArgs({
            chainId: input.chainId,
            toNativeAsset: !!input.toNativeAsset,
            poolId: poolState.id,
            sortedTokens,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
        });

        const queryOutput = await doRemoveLiquidityQuery(
            input.rpcUrl,
            input.chainId,
            args,
        );

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(bpt, queryOutput.bptIn);

        const amountsOut = queryOutput.amountsOut.map((a, i) =>
            TokenAmount.fromRawAmount(tokensOut[i], a),
        );

        return {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
            toInternalBalance: !!input.toInternalBalance,
            balancerVersion: poolState.balancerVersion,
        };
    }

    public buildCall(
        input: RemoveLiquidityWeightedCall,
    ): RemoveLiquidityBuildOutput {
        const amounts = getAmountsCall(input);

        const userData = WeightedEncoder.encodeRemoveLiquidityUserData(
            input.removeLiquidityKind,
            amounts,
        );

        const { args } = parseRemoveLiquidityArgs({
            poolId: input.poolId,
            sortedTokens: input.amountsOut.map((a) => a.token),
            sender: input.sender,
            recipient: input.recipient,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
        });

        const call = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'exitPool',
            args,
        });

        return {
            call,
            to: VAULT[input.chainId],
            value: 0n,
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }
}
