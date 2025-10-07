import { encodeFunctionData } from 'viem';
import { BaseToken } from '@/entities/baseToken';
import { TokenAmount } from '@/entities/tokenAmount';
import { WeightedEncoder } from '@/entities/encoders/weighted';
import { protocolVersionError, VAULT_V2, ZERO_ADDRESS } from '@/utils';
import { vaultV2Abi } from '@/abi';
import {
    AddLiquidityBase,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
} from '@/entities/addLiquidity/types';
import { PoolState } from '@/entities/types';
import {
    doAddLiquidityQuery,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '@/entities/utils';
import { getAmountsCall, getAmountsQuery } from '../../helpers';
import { getValue } from '../../../utils/getValue';
import {
    AddLiquidityV2BaseBuildCallInput,
    AddLiquidityV2BaseQueryOutput,
} from '../types';

export class AddLiquidityWeighted implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityV2BaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = await getAmountsQuery(input, poolState);

        const userData = WeightedEncoder.encodeAddLiquidityUserData(
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

        const bpt = new BaseToken(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryOutput.bptOut);

        const amountsIn = queryOutput.amountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(tokensIn[i], a),
        );

        return {
            to: VAULT_V2[input.chainId],
            poolType: poolState.type,
            addLiquidityKind: input.kind,
            poolId: poolState.id,
            bptOut,
            amountsIn,
            chainId: input.chainId,
            tokenInIndex: amounts.tokenInIndex,
            protocolVersion: 2,
        };
    }

    public buildCall(
        input: AddLiquidityV2BaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        const userData = WeightedEncoder.encodeAddLiquidityUserData(
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
            to: VAULT_V2[input.chainId],
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

    public buildCallWithPermit2(
        input: AddLiquidityV2BaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        throw protocolVersionError(
            'buildCallWithPermit2',
            input.protocolVersion,
            'buildCallWithPermit2 is supported on Balancer v3 only.',
        );
    }
}
