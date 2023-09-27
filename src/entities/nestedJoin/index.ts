import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    encodeFunctionData,
    http,
} from 'viem';
import { Address, Hex } from '../../types';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { BALANCER_RELAYER, CHAINS, getPoolAddress } from '../../utils';
import { Relayer } from '../relayer';
import { parseNestedJoinArgs } from '../utils/parseNestedJoinArgs';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi, bathcRelayerLibraryAbi } from '../../abi';

export type NestedJoinInput = {
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[];
    chainId: number;
    rpcUrl: string;
    testAddress: Address;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type JoinStep = {
    action: 'join'; // TODO: are we supporting other actions, such as swaps?
    level: number; // 0 is the bottom and the highest level is the top
    input: NestedToken;
    poolId: Address; // output poolId
    isTop: boolean;
};

export type NestedPoolState = {
    pools: {
        id: Hex;
        address: Address;
        type: string;
    }[];
    joinSteps: JoinStep[]; // each token should have at least one
};

type NestedToken = {
    address: Address;
    decimals: number;
    index: number;
};

export type NestedJoinArgs = {
    chainId: number;
    useNativeAssetAsWrappedAmountIn?: boolean;
    sortedTokens: Token[];
    poolId: Address;
    poolType: string;
    kind: number;
    sender: Address;
    recipient: Address;
    maxAmountsIn: {
        amount: bigint;
        isRef: boolean;
    }[];
    minBptOut: bigint;
    fromInternalBalance: boolean;
    outputReferenceKey: bigint;
};

type NestedJoinQueryResult = {
    calls: NestedJoinArgs[];
    bptOut: TokenAmount;
};

type NestedJoinCallInput = NestedJoinQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};

const outputRefOffset = 100n;

export class NestedJoin {
    async query(
        input: NestedJoinInput,
        nestedPoolState: NestedPoolState,
    ): Promise<NestedJoinQueryResult> {
        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        // sort pools by ascending level
        // then go from bottom pool to up filling out input and output amounts from joinSteps
        // input at level 0 are either amountsIn provided or 0n
        // input at following levels can be amountsIn provided, output of the previous level or 0n
        // output at max level is the bptOut

        const stepsSortedByLevel = nestedPoolState.joinSteps.sort(
            (a, b) => a.level - b.level,
        );
        const poolIdsSortedByLevel = [
            ...new Set(stepsSortedByLevel.map((s) => s.poolId)),
        ];
        const poolsSortedByLevel = poolIdsSortedByLevel.map(
            (poolId) => nestedPoolState.pools.find((p) => p.id === poolId)!,
        );

        const calls: NestedJoinArgs[] = [];
        for (const pool of poolsSortedByLevel) {
            const joinStepsForPool = nestedPoolState.joinSteps
                .filter((j) => j.poolId === pool.id)
                .sort((a, b) => a.input.index - b.input.index);
            calls.push({
                chainId: input.chainId,
                useNativeAssetAsWrappedAmountIn:
                    input.useNativeAssetAsWrappedAmountIn,
                sortedTokens: joinStepsForPool.map((joinStep) => {
                    return new Token(
                        input.chainId,
                        joinStep.input.address,
                        joinStep.input.decimals,
                    );
                }),
                poolId: pool.id,
                poolType: pool.type,
                kind: 0,
                sender: input.testAddress,
                recipient: input.testAddress,
                maxAmountsIn: joinStepsForPool.map((joinStep) => {
                    const amountIn = input.amountsIn.find(
                        (a) => a.address === joinStep.input.address,
                    );
                    const lowerLevelCall = calls.find(
                        (call) =>
                            getPoolAddress(call.poolId) ===
                            joinStep.input.address,
                    );
                    if (amountIn) {
                        return {
                            amount: amountIn.rawAmount, // TODO: add proportions for duplicate tokens
                            isRef: false,
                        };
                    } else if (lowerLevelCall !== undefined) {
                        return {
                            amount: lowerLevelCall.outputReferenceKey,
                            isRef: true,
                        };
                    } else {
                        return {
                            amount: 0n,
                            isRef: false,
                        };
                    }
                }),
                minBptOut: 0n,
                fromInternalBalance: input.fromInternalBalance ?? false,
                outputReferenceKey:
                    BigInt(poolsSortedByLevel.indexOf(pool)) + outputRefOffset,
            });
        }

        const parsedCalls = calls.map((call) => parseNestedJoinArgs(call));

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'joinPool',
                args: parsedCall.args,
            }),
        );

        // peek join output
        const peekCall = Relayer.encodePeekChainedReferenceValue(
            Relayer.toChainedReference(
                calls[calls.length - 1].outputReferenceKey,
                false,
            ),
        );
        encodedCalls.push(peekCall);

        const encodedMulticall = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'vaultActionsQueryMulticall',
            args: [encodedCalls],
        });

        const { data } = await client.call({
            account: input.testAddress,
            to: BALANCER_RELAYER,
            data: encodedMulticall,
        });

        const result = decodeFunctionResult({
            abi: balancerRelayerAbi,
            functionName: 'vaultActionsQueryMulticall',
            data: data as Hex,
        });

        // TODO: extend logic for multiple peek calls in the context of non-leaf joins
        const peekCallIndex = encodedCalls.length - 1;
        const peekedValue = decodeAbiParameters(
            [{ type: 'uint256' }],
            result[peekCallIndex],
        )[0];
        console.log('query bpt out', peekedValue);

        const tokenOut = new Token(
            input.chainId,
            getPoolAddress(calls[calls.length - 1].poolId),
            18,
        );

        const bptOut = TokenAmount.fromRawAmount(tokenOut, peekedValue);

        return { calls, bptOut };
    }

    buildCall(input: NestedJoinCallInput): {
        call: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
    } {
        // apply slippage to bptOut
        const minBptOut = input.slippage.removeFrom(input.bptOut.amount);

        // update last call with minBptOut limit in place
        input.calls[input.calls.length - 1] = {
            ...input.calls[input.calls.length - 1],
            minBptOut,
        };

        const parsedCalls = input.calls.map((call) =>
            parseNestedJoinArgs(call),
        );

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'joinPool',
                args: parsedCall.args,
            }),
        );

        if (input.relayerApprovalSignature !== undefined) {
            encodedCalls.unshift(
                Relayer.encodeSetRelayerApproval(
                    BALANCER_RELAYER,
                    true,
                    input.relayerApprovalSignature,
                ),
            );
        }

        const call = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'multicall',
            args: [encodedCalls],
        });

        return {
            call,
            to: BALANCER_RELAYER,
            value: undefined, // TODO: update value for native asset joins
            minBptOut,
        };
    }
}
