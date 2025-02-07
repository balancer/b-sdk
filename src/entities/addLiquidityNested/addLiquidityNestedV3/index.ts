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
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedInput,
} from '../types';
import { Token } from '@/entities/token';
import { getAmounts, getValue } from '@/entities/utils';
import { TokenAmount } from '@/entities/tokenAmount';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED } from '@/utils/constantsV3';
import { CHAINS } from '@/utils';
import {
    balancerCompositeLiquidityRouterNestedAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import {
    AddLiquidityNestedCallInputV3,
    AddLiquidityNestedInputV3,
    AddLiquidityNestedQueryOutputV3,
} from './types';
import { validateQueryInput } from '../addLiquidityNestedV2/validateInputs';
import { Permit2 } from '@/entities/permit2Helper';

export class AddLiquidityNestedV3 {
    /**
     *
     * @param input amountsIn can be any order and does not need all tokens. Tokens must be tokens of child pools and must not be BPT.
     * @param nestedPoolState
     * @returns
     */
    async query(
        input: AddLiquidityNestedInputV3,
        nestedPoolState: NestedPoolState,
        block?: bigint,
    ): Promise<AddLiquidityNestedQueryOutputV3> {
        validateQueryInput(input, nestedPoolState);

        // Address of the highest level pool (which contains BPTs of other pools), i.e. the pool we wish to join
        const parentPool = nestedPoolState.pools.reduce((max, curr) =>
            curr.level > max.level ? curr : max,
        );
        // query function input, `tokensIn` array, must have all tokens from child pools
        // and all tokens that are not BPTs from the nested pool (parent pool).
        const mainTokens = nestedPoolState.mainTokens.map(
            (t) => new Token(input.chainId, t.address, t.decimals),
        );
        // This will add 0 amount for any tokensIn the user hasn't included
        const maxAmountsIn = getAmounts(mainTokens, input.amountsIn, 0n);

        // Query the router to get the onchain amount
        // Note - tokens do not have to be sorted, user preference is fine
        const bptAmountOut = await this.doQueryAddLiquidityUnbalancedNestedPool(
            input,
            parentPool.address,
            nestedPoolState.mainTokens.map((t) => t.address),
            maxAmountsIn,
            input.sender ?? zeroAddress,
            input.userData ?? '0x',
            block,
        );

        const bptToken = new Token(input.chainId, parentPool.address, 18);

        return {
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[input.chainId],
            parentPool: parentPool.address,
            chainId: input.chainId,
            amountsIn: mainTokens.map((t, i) =>
                TokenAmount.fromRawAmount(t, maxAmountsIn[i]),
            ),
            bptOut: TokenAmount.fromRawAmount(bptToken, bptAmountOut),
            protocolVersion: 3,
            userData: input.userData ?? '0x',
        };
    }

    buildCall(
        input: AddLiquidityNestedCallInputV3,
    ): AddLiquidityNestedBuildCallOutput {
        // validateBuildCallInput(input); TODO - Add this like V2 once weth/native is allowed
        // apply slippage to bptOut
        const minBptOut = input.slippage.applyTo(input.bptOut.amount, -1);
        const wethIsEth = input.wethIsEth ?? false;
        const callData = encodeFunctionData({
            abi: balancerCompositeLiquidityRouterNestedAbi,
            functionName: 'addLiquidityUnbalancedNestedPool',
            args: [
                input.parentPool,
                input.amountsIn.map((a) => a.token.address),
                input.amountsIn.map((a) => a.amount),
                minBptOut,
                wethIsEth,
                input.userData,
            ],
        });
        return {
            callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[input.chainId],
            value: getValue(input.amountsIn, wethIsEth),
            minBptOut,
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityNestedCallInputV3,
        permit2: Permit2,
    ): AddLiquidityNestedBuildCallOutput {
        const buildCallOutput = this.buildCall(input);

        const args = [
            [],
            [],
            permit2.batch,
            permit2.signature,
            [buildCallOutput.callData],
        ] as const;

        const callData = encodeFunctionData({
            abi: balancerCompositeLiquidityRouterNestedAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }

    private doQueryAddLiquidityUnbalancedNestedPool = async (
        { rpcUrl, chainId }: AddLiquidityNestedInput,
        parentPool: Address,
        tokensIn: Address[],
        maxAmountsIn: bigint[],
        sender: Address,
        userData: Hex,
        block?: bigint,
    ) => {
        const client = createPublicClient({
            transport: http(rpcUrl),
            chain: CHAINS[chainId],
        });

        const { result: bptAmountOut } = await client.simulateContract({
            address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId],
            abi: [
                ...balancerCompositeLiquidityRouterNestedAbi,
                ...vaultV3Abi,
                ...vaultExtensionAbi_V3,
                ...permit2Abi,
            ],
            functionName: 'queryAddLiquidityUnbalancedNestedPool',
            args: [parentPool, tokensIn, maxAmountsIn, sender, userData],
            blockNumber: block,
        });
        return bptAmountOut;
    };
}
