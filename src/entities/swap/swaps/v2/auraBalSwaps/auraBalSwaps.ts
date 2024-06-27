import { TokenAmount } from '../../../../tokenAmount';
import { SwapKind, Hex } from '../../../../../types';
import { Address, PublicClient, createPublicClient, http } from 'viem';
import { getLimitAmount } from '../../../limits';
import { Slippage } from '@/entities/slippage';
import { Token } from '@/entities/token';
import { BALANCER_RELAYER, CHAINS } from '@/utils';
import { validateInputs } from './validateInputs';
import { queryJoinSwap, buildJoinSwapCall } from './joinSwap';

export type AuraBalSwapQueryInput = {
    inputAmount: TokenAmount;
    swapToken: Token;
    kind: AuraBalSwapKind;
};

export type AuraBalSwapQueryOutput = {
    inputAmount: TokenAmount;
    expectedAmountOut: TokenAmount;
    kind: AuraBalSwapKind;
};

type AuraBalSwapBuildCallInput = {
    slippage: Slippage;
    wethIsEth: boolean;
    queryOutput: AuraBalSwapQueryOutput;
    user: Address;
    relayerApprovalSignature?: Hex;
};

type AuraBalSwapBuildOutput = {
    to: Address;
    callData: Hex;
    value: bigint;
    minAmountOut: TokenAmount;
};

export enum AuraBalSwapKind {
    FromAuraBal = 0,
    ToAuraBal = 1,
}

export class AuraBalSwap {
    public client: PublicClient;

    constructor(rpcUrl: string) {
        this.client = createPublicClient({
            transport: http(rpcUrl),
            chain: CHAINS[1],
        });
    }

    public async query(
        input: AuraBalSwapQueryInput,
    ): Promise<AuraBalSwapQueryOutput> {
        const { inputAmount, swapToken, kind } = input;
        validateInputs(inputAmount, swapToken, kind);

        if (kind === AuraBalSwapKind.ToAuraBal)
            return queryJoinSwap({ ...input, client: this.client });

        throw new Error('FromAuraBal Not Supported');
    }

    /**
     * Returns the transaction data to be sent to the relayer contract
     *
     * @param input
     * @returns
     */
    buildCall(input: AuraBalSwapBuildCallInput): AuraBalSwapBuildOutput {
        const limitAmount = getLimitAmount(
            input.slippage,
            SwapKind.GivenIn,
            input.queryOutput.expectedAmountOut,
        );

        if (input.queryOutput.kind === AuraBalSwapKind.ToAuraBal) {
            const callData = buildJoinSwapCall(
                input.user,
                input.queryOutput.inputAmount.amount,
                limitAmount.amount,
                input.queryOutput.inputAmount.token,
                input.relayerApprovalSignature,
            );
            return {
                to: BALANCER_RELAYER[1],
                callData,
                value: 0n,
                minAmountOut: limitAmount,
            };
        }

        throw new Error('FromAuraBal Not Supported');
    }
}
