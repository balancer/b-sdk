import {
    Address,
    createPublicClient,
    encodeFunctionData,
    Hex,
    http,
    zeroAddress,
} from 'viem';
import { NestedPoolState } from '@/entities/types';
import {
    RemoveLiquidityNestedCallInputV3,
    RemoveLiquidityNestedProportionalInputV3,
    RemoveLiquidityNestedQueryOutputV3,
} from './types';
import { RemoveLiquidityNestedBuildCallOutput } from '../types';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';
import {
    balancerCompositeLiquidityRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';

export class RemoveLiquidityNestedV3 {
    async query(
        input: RemoveLiquidityNestedProportionalInputV3,
        nestedPoolState: NestedPoolState,
        block?: bigint,
    ): Promise<RemoveLiquidityNestedQueryOutputV3> {
        // Address of the highest level pool (which contains BPTs of other pools), i.e. the pool we wish to join
        const parentPool = nestedPoolState.pools.reduce((max, curr) =>
            curr.level > max.level ? curr : max,
        );
        // query function input, `tokensIn` array, must have all tokens from child pools
        // and all tokens that are not BPTs from the nested pool (parent pool).
        const mainTokens = nestedPoolState.mainTokens.map(
            (t) => new Token(input.chainId, t.address, t.decimals),
        );

        const bptToken = new Token(input.chainId, parentPool.address, 18);

        const amountsOut =
            await this.doQueryRemoveLiquidityProportionalNestedPool(
                input,
                parentPool.address,
                input.bptAmountIn,
                mainTokens.map((t) => t.address),
                input.sender ?? zeroAddress,
                input.userData ?? '0x',
                block,
            );

        return {
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            protocolVersion: 3,
            bptAmountIn: TokenAmount.fromRawAmount(bptToken, input.bptAmountIn),
            chainId: input.chainId,
            parentPool: parentPool.address,
            userData: input.userData ?? '0x',
            amountsOut: amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(mainTokens[i], a),
            ),
        };
    }

    buildCall(
        input: RemoveLiquidityNestedCallInputV3,
    ): RemoveLiquidityNestedBuildCallOutput {
        // validateBuildCallInput(input); TODO - Add this like V2 once weth/native is allowed

        // apply slippage to amountsOut
        const minAmountsOut = input.amountsOut.map((amountOut) =>
            TokenAmount.fromRawAmount(
                amountOut.token,
                input.slippage.applyTo(amountOut.amount, -1),
            ),
        );

        const callData = encodeFunctionData({
            abi: balancerCompositeLiquidityRouterAbi,
            functionName: 'removeLiquidityProportionalNestedPool',
            args: [
                input.parentPool,
                input.bptAmountIn.amount,
                minAmountsOut.map((a) => a.token.address),
                minAmountsOut.map((a) => a.amount),
                input.wethIsEth ?? false,
                input.userData,
            ],
        });
        return {
            callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            minAmountsOut,
        } as RemoveLiquidityNestedBuildCallOutput;
    }

    private doQueryRemoveLiquidityProportionalNestedPool = async (
        { rpcUrl, chainId }: RemoveLiquidityNestedProportionalInputV3,
        parentPool: Address,
        exactBptAmountIn: bigint,
        tokensOut: Address[],
        sender: Address,
        userData: Hex,
        block?: bigint,
    ) => {
        const client = createPublicClient({
            transport: http(rpcUrl),
            chain: CHAINS[chainId],
        });

        const { result: amountsOut } = await client.simulateContract({
            address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            abi: [
                ...balancerCompositeLiquidityRouterAbi,
                ...vaultV3Abi,
                ...vaultExtensionAbi_V3,
                ...permit2Abi,
            ],
            functionName: 'queryRemoveLiquidityProportionalNestedPool',
            args: [parentPool, exactBptAmountIn, tokensOut, sender, userData],
            blockNumber: block,
        });
        return amountsOut;
    };
}
