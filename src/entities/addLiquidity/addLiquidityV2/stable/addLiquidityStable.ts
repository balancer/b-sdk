import { vaultV2Abi } from '@/abi';
import {
    AddLiquidityBase,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
} from '@/entities/addLiquidity/types';
import { StableEncoder } from '@/entities/encoders/stable';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    doAddLiquidityQuery,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '@/entities/utils';
import { getValue } from '@/entities/utils/getValue';
import {
    VAULT,
    ZERO_ADDRESS,
    buildCallWithPermit2ProtocolVersionError,
} from '@/utils';
import { encodeFunctionData } from 'viem';

import { getAmountsCall, getAmountsQuery } from '../../helpers';
import { AddLiquidityV2BaseBuildCallInput } from '../types';

export class AddLiquidityStable implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = await getAmountsQuery(input, poolState);

        const userData = StableEncoder.encodeAddLiquidityUserData(
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
            chainId: input.chainId,
            tokenInIndex: amounts.tokenInIndex,
            protocolVersion: poolState.protocolVersion,
        };
    }

    public buildCall(
        input: AddLiquidityV2BaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        const userData = StableEncoder.encodeAddLiquidityUserData(
            input.addLiquidityKind,
            amounts,
        );

        const { args } = parseAddLiquidityArgs({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance,
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
