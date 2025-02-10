import { TokenAmount } from '../../../../tokenAmount';
import { SwapKind, Hex } from '../../../../../types';
import { Address, PublicClient, createPublicClient, http } from 'viem';
import { getLimitAmount } from '../../../limits';
import { Slippage } from '@/entities/slippage';
import { CHAINS, ChainId } from '@/utils';
import { BALANCER_RELAYER } from '@/utils/constantsV2';
import { isAuraBalSwap, parseInputs } from './parseInputs';
import { queryJoinSwap, buildJoinSwapCall } from './joinSwap';
import { buildSwapExitCall, querySwapExit } from './swapExit';
import {
    AuraBalSwapQueryOutput,
    SwapQueryInput,
    AuraBalSwapKind,
} from './types';

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

export class AuraBalSwap {
    public client: PublicClient;

    constructor(rpcUrl: string) {
        this.client = createPublicClient({
            transport: http(rpcUrl),
            chain: CHAINS[ChainId.MAINNET],
        });
    }

    public isAuraBalSwap(input: SwapQueryInput) {
        return isAuraBalSwap(input);
    }

    public async query(input: SwapQueryInput): Promise<AuraBalSwapQueryOutput> {
        const inputs = parseInputs(input);

        if (inputs.kind === AuraBalSwapKind.ToAuraBal)
            return queryJoinSwap({ ...inputs, client: this.client });

        return querySwapExit({ ...inputs, client: this.client });
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

        let callData: Hex;
        let value = 0n;
        if (input.queryOutput.kind === AuraBalSwapKind.ToAuraBal) {
            const buildOutput = buildJoinSwapCall(
                input.user,
                input.queryOutput.inputAmount.amount,
                limitAmount.amount,
                input.queryOutput.inputAmount.token,
                input.wethIsEth,
                input.relayerApprovalSignature,
            );
            callData = buildOutput.callData;
            value = buildOutput.value;
        } else {
            callData = buildSwapExitCall(
                input.user,
                input.queryOutput.inputAmount.amount,
                limitAmount.amount,
                input.queryOutput.expectedAmountOut.token,
                input.wethIsEth,
                input.relayerApprovalSignature,
            );
        }

        return {
            to: BALANCER_RELAYER[ChainId.MAINNET],
            callData,
            value,
            minAmountOut: limitAmount,
        };
    }
}
