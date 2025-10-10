import { encodeFunctionData } from 'viem';
import { Token } from '../../../token';
import { TokenAmount } from '../../../tokenAmount';
import { StableEncoder } from '../../../encoders/stable';
import {
    protocolVersionError,
    VAULT_V2,
    ZERO_ADDRESS,
} from '../../../../utils';
import { vaultV2Abi } from '../../../../abi';
import { parseRemoveLiquidityArgs } from '../../../utils/parseRemoveLiquidityArgs';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
} from '../../types';
import { PoolState } from '../../../types';
import { doRemoveLiquidityQuery } from '../../../utils/doRemoveLiquidityQuery';
import {
    calculateProportionalAmounts,
    getPoolStateWithBalancesV2,
    getSortedTokens,
} from '../../../utils';
import { getAmountsCall, getAmountsQuery } from '../../helper';
import { RemoveLiquidityV2BaseBuildCallInput } from '../types';

export class RemoveLiquidityStable implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        if (input.kind === RemoveLiquidityKind.Recovery) {
            return this.queryRemoveLiquidityRecovery(input, poolState);
        }

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        const userData = StableEncoder.encodeRemoveLiquidityUserData(
            input.kind,
            amounts,
        );

        const { args, tokensOut } = parseRemoveLiquidityArgs({
            chainId: input.chainId,
            poolId: poolState.id,
            sortedTokens,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut: amounts.minAmountsOut,
            userData,
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
            to: VAULT_V2[input.chainId],
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };
    }

    // RemoveLiquidityRecovery doesn't have a proper query method on v2, so
    // this method replicates SC behavior off-chain
    private async queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        const poolStateWithBalances = await getPoolStateWithBalancesV2(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { tokenAmounts } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.bptIn,
        );

        const bptToken = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(
            bptToken,
            input.bptIn.rawAmount,
        );
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        return {
            to: VAULT_V2[input.chainId],
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: undefined,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };
    }

    public buildCall(
        input: RemoveLiquidityV2BaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        const userData = StableEncoder.encodeRemoveLiquidityUserData(
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
            wethIsEth: !!input.wethIsEth,
            chainId: input.chainId,
        });

        const callData = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'exitPool',
            args,
        });

        return {
            callData,
            to: VAULT_V2[input.chainId],
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

    buildCallWithPermit(
        input: RemoveLiquidityV2BaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        throw protocolVersionError(
            'buildCallWithPermit',
            input.protocolVersion,
            'buildCallWithPermit is supported on Balancer v3 only.',
        );
    }
}
