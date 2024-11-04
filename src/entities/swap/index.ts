import { SwapKind } from '../../types';
import { TokenAmount } from '../tokenAmount';
import { Permit2 } from '../permit2Helper';
import { validatePaths } from './paths';
import { SwapV2 } from './swaps/v2';
import { SwapV3 } from './swaps/v3';
import { SwapBase } from './swaps/types';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
} from './types';
import { InputValidator } from '../inputValidator/inputValidator';
import { Address } from 'viem';

export * from './types';
export * from './paths';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;
    public protocolVersion: 2 | 3;

    public constructor(swapInput: SwapInput) {
        validatePaths(swapInput.paths);
        const _protocolVersion = swapInput.paths[0].protocolVersion;

        switch (_protocolVersion) {
            case 2:
                this.swap = new SwapV2(swapInput);
                break;
            case 3:
                this.swap = new SwapV3(swapInput);
                break;
            default:
                throw Error(
                    `SDK does not support swap for vault version: ${_protocolVersion}`,
                );
        }
        this.protocolVersion = _protocolVersion;
    }

    public get quote(): TokenAmount {
        return this.swap.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    public get inputAmount(): TokenAmount {
        return this.swap.inputAmount;
    }

    public get outputAmount(): TokenAmount {
        return this.swap.outputAmount;
    }

    public get isBatchSwap(): boolean {
        return this.swap.isBatchSwap;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(
        rpcUrl?: string,
        block?: bigint,
        sender?: Address,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        return this.swap.query(rpcUrl, block, sender);
    }

    public queryCallData(): string {
        return this.swap.queryCallData();
    }

    /**
     * Returns the transaction data to be sent to the vault contract
     *
     * @param input
     * @returns
     */
    buildCall(
        input: SwapBuildCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        const isV2Input = 'sender' in input;
        if (this.protocolVersion === 3 && isV2Input)
            throw Error('Cannot define sender/recipient in V3');

        if (this.protocolVersion === 2 && !isV2Input)
            throw Error('Sender/recipient must be defined in V2');

        return this.swap.buildCall(input);
    }

    buildCallWithPermit2(
        input: SwapBuildCallInput,
        permit2: Permit2,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        InputValidator.validateBuildCallWithPermit2({
            protocolVersion: this.protocolVersion,
        });

        return this.swap.buildCallWithPermit2(input, permit2);
    }
}
