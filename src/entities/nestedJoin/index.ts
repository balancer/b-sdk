import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    encodeFunctionData,
    http,
    parseUnits,
} from 'viem';
import { Address, Hex, HumanAmount } from '../../types';
import { Slippage } from '../slippage';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi } from '../../abi/balancerRelayer';
import { bathcRelayerLibraryAbi } from '../../abi/batchRelayerLibrary';
import { BALANCER_RELAYER, CHAINS } from '../../utils';
import { StableEncoder } from '../encoders/stable';
import { Relayer } from '../relayer';

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
    action: 'join'; // TODO: check the need for other actions
    level: number; // 0 is the bottom and the highest level is the top
    poolId: Address; // output poolId
    isTop: boolean;
};

export type NestedPoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: NestedToken[];
};

type NestedToken = {
    address: Address;
    decimals: number;
    index: number;
    joinSteps: JoinStep[]; // each token should have at least one
};

type NestedJoinQueryResult = {
    poolId: Address;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
};

type NestedJoinCallInput = NestedJoinQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};

const joinPathOutputRefIndex = 100n;

export class NestedJoin {
    async query(
        input: NestedJoinInput,
        nestedPoolState: NestedPoolState,
        // TODO: should we have a separate pool state for nested joins or should we have a global pool state?
    ): Promise<NestedJoinQueryResult> {
        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        // encode call with hardcoded amounts for initial testing
        const encodedCall = this.encodeJoinPoolForQuery(input, nestedPoolState);

        const encodedCalls = [encodedCall];

        // peek join output
        const peekCall = Relayer.encodePeekChainedReferenceValue(
            Relayer.toChainedReference(joinPathOutputRefIndex, false),
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

        const peekCallIndex = 1; // TODO: replace hardcoded 1 by peek call indexes
        const peekedValue = decodeAbiParameters(
            [{ type: 'uint256' }],
            result[peekCallIndex],
        )[0];
        console.log('peekedValue', peekedValue);

        const bptToken = new Token(input.chainId, nestedPoolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bptToken, peekedValue);
        const placeholder: NestedJoinQueryResult = {
            poolId: '0x123',
            bptOut,
            amountsIn: [bptOut], // ignore these values for now
            fromInternalBalance: false,
        };
        return new Promise((resolve) => resolve(placeholder));
    }

    buildCall(input: NestedJoinCallInput): {
        call: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    } {
        const { encodedCall, minBptOut } = this.encodeJoinPoolForCall(input);

        const encodedCalls = [encodedCall];

        if (input.relayerApprovalSignature !== undefined) {
            encodedCalls.unshift(input.relayerApprovalSignature);
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
            maxAmountsIn: input.amountsIn.map((a) => a.amount),
        };
    }

    private encodeJoinPoolForQuery = (
        input: NestedJoinInput,
        nestedPoolState: NestedPoolState,
    ) => {
        const amountsIn = ['1', '0', '0', '0'].map((a, i) =>
            TokenAmount.fromHumanAmount(
                new Token(
                    input.chainId,
                    nestedPoolState.tokens[i].address,
                    nestedPoolState.tokens[i].decimals,
                ),
                a as HumanAmount,
            ),
        );

        const poolId =
            '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7' as Address; // 3POOL
        const kind = 0;
        const sender = input.testAddress;
        const recipient = input.testAddress;
        const joinPoolRequest = {
            assets: [
                '0x6b175474e89094c44da98b954eedeac495271d0f',
                '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                '0xdac17f958d2ee523a2206206994597c13d831ec7',
            ] as Address[],
            maxAmountsIn: amountsIn.map((a) => a.amount),
            // TODO: replace by ComposableStableEncoder (this works because it's the same enum value by coincidence)
            userData: StableEncoder.joinUnbalanced(
                [parseUnits('1', 18), 0n, 0n],
                0n,
            ),
            fromInternalBalance: false,
        };
        const value = 0n;
        const outputReference = Relayer.toChainedReference(
            joinPathOutputRefIndex,
            false,
        );

        const encodedCall = encodeFunctionData({
            abi: bathcRelayerLibraryAbi,
            functionName: 'joinPool',
            args: [
                poolId,
                kind,
                sender,
                recipient,
                joinPoolRequest,
                value,
                outputReference,
            ],
        });
        return encodedCall;
    };

    private encodeJoinPoolForCall = (input: NestedJoinCallInput) => {
        const minBptOut = input.slippage.removeFrom(input.bptOut.amount);

        const poolId =
            '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7' as Address; // 3POOL
        const kind = 0;
        const joinPoolRequest = {
            assets: [
                '0x6b175474e89094c44da98b954eedeac495271d0f',
                '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                '0xdac17f958d2ee523a2206206994597c13d831ec7',
            ] as Address[],
            maxAmountsIn: [parseUnits('1', 18), 0n, 0n, 0n],
            // TODO: replace by ComposableStableEncoder (this works because it's the same enum value by coincidence)
            userData: StableEncoder.joinUnbalanced(
                [parseUnits('1', 18), 0n, 0n],
                minBptOut,
            ),
            fromInternalBalance: false,
        };
        const value = 0n;
        const joinPathOutputRefIndex = 100n; // must be the same used on peek
        const outputReference = Relayer.toChainedReference(
            joinPathOutputRefIndex,
        );

        const encodedCall = encodeFunctionData({
            abi: bathcRelayerLibraryAbi,
            functionName: 'joinPool',
            args: [
                poolId,
                kind,
                input.sender,
                input.recipient,
                joinPoolRequest,
                value,
                outputReference,
            ],
        });

        return { encodedCall, minBptOut };
    };
}
