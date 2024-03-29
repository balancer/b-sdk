import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { validatePaths } from './paths';
import { SwapV2 } from './swaps/v2';
import { SwapV3 } from './swaps/v3';
import { SwapBase } from './swaps/types';
import {
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
    ExactOutQueryOutput,
    ExactInQueryOutput,
} from './types';

export * from './types';
export * from './paths';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;
    public vaultVersion: 2 | 3;

    public constructor(swapInput: SwapInput) {
        validatePaths(swapInput.paths);

        if (swapInput.paths[0].vaultVersion === 2) {
            this.vaultVersion = 2;
            this.swap = new SwapV2(swapInput);
        } else {
            this.vaultVersion = 3;
            this.swap = new SwapV3(swapInput);
        }
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

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(
        rpcUrl?: string,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput> {
        return this.swap.query(rpcUrl, block);
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
        if (this.vaultVersion === 3 && isV2Input)
            throw Error('Cannot define sender/recipient in V3');

        if (this.vaultVersion === 2 && !isV2Input)
            throw Error('Sender/recipient must be defined in V2');

        return this.swap.buildCall(input);
    }
}
