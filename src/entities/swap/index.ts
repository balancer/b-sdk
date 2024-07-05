import { Address, Client, PublicActions, WalletActions } from 'viem';

import { SwapKind } from '../../types';
import { TokenAmount } from '../tokenAmount';
import { Permit2BatchAndSignature } from '../permit2';
import { validatePaths } from './paths';
import { SwapV2 } from './swaps/v2';
import { SwapV3 } from './swaps/v3';
import { SwapBase } from './swaps/types';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildCallInput,
    SwapBuildCallInputBase,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    SwapInput,
} from './types';
import { NATIVE_ASSETS, swapETHBuildCallWithPermit2Error } from '@/utils';

export * from './types';
export * from './paths';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;
    public vaultVersion: 2 | 3;

    public constructor(swapInput: SwapInput) {
        validatePaths(swapInput.paths);
        const _vaultVersion = swapInput.paths[0].vaultVersion;

        switch (_vaultVersion) {
            case 2:
                this.swap = new SwapV2(swapInput);
                break;
            case 3:
                this.swap = new SwapV3(swapInput);
                break;
            default:
                throw Error(
                    `SDK does not support swap for vault version: ${_vaultVersion}`,
                );
        }
        this.vaultVersion = _vaultVersion;
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

    async getPermit2BatchAndSignature(
        input: SwapBuildCallInputBase & {
            client: Client & PublicActions & WalletActions;
            owner: Address;
        },
    ): Promise<Permit2BatchAndSignature> {
        return this.swap.getPermit2BatchAndSignature(input);
    }

    buildCallWithPermit2(
        input: SwapBuildCallInput,
        permit2: Permit2BatchAndSignature,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut {
        if (
            input.wethIsEth &&
            this.inputAmount.token.address ===
                NATIVE_ASSETS[this.swap.chainId].wrapped
        ) {
            throw swapETHBuildCallWithPermit2Error;
        }

        if (this.vaultVersion === 3) {
            return this.swap.buildCallWithPermit2(input, permit2);
        }

        throw Error(
            'buildCall with Permit2 signatures is only available for v3',
        );
    }
}
