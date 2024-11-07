import { vaultV2Abi } from '@/abi';
import {
    AddLiquidityBase,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
} from '@/entities/addLiquidity/types';
import { ComposableStableEncoder } from '@/entities/encoders/composableStable';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    doAddLiquidityQuery,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '@/entities/utils';
import {
    VAULT,
    ZERO_ADDRESS,
    buildCallWithPermit2ProtocolVersionError,
} from '@/utils';
import { encodeFunctionData } from 'viem';

import { getValue } from '../../../utils/getValue';
import { getAmountsCall, getAmountsQuery } from '../../helpers';
import {
    AddLiquidityV2ComposableStableBuildCallInput,
    AddLiquidityV2ComposableStableQueryOutput,
} from './types';

export class AddLiquidityComposableStable implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityV2ComposableStableQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const bptIndex = sortedTokens.findIndex(
            (t) => t.address === poolState.address,
        );

        const amounts = await getAmountsQuery(input, poolState, bptIndex);

        const userData = ComposableStableEncoder.encodeAddLiquidityUserData(
            input.kind,
            amounts,
        );

        const { args, tokensIn } = parseAddLiquidityArgs({
            chainId: input.chainId,
            sortedTokens,
            poolId: poolState.id,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: false, // This isn't required for the query
        });

        const queryOutput = await doAddLiquidityQuery(
            input.rpcUrl,
            input.chainId,
            args,
        );

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryOutput.bptOut);

        const amountsIn = queryOutput.amountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(tokensIn[i], a),
        );

        return {
            poolType: poolState.type,
            addLiquidityKind: input.kind,
            poolId: poolState.id,
            bptOut,
            amountsIn,
            tokenInIndex: amounts.tokenInIndex,
            chainId: input.chainId,
            protocolVersion: 2,
            bptIndex,
        };
    }

    public buildCall(
        input: AddLiquidityV2ComposableStableBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input, input.bptIndex);

        const userData = ComposableStableEncoder.encodeAddLiquidityUserData(
            input.addLiquidityKind,
            amounts,
        );

        const { args } = parseAddLiquidityArgs({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: !!input.fromInternalBalance,
            wethIsEth: !!input.wethIsEth,
        });

        const callData = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'joinPool',
            args,
        });

        return {
            callData,
            args,
            to: VAULT[input.chainId],
            value: getValue(input.amountsIn, !!input.wethIsEth),
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }

    public buildCallWithPermit2(): AddLiquidityBuildCallOutput {
        throw buildCallWithPermit2ProtocolVersionError;
    }
}
