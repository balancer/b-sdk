import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityBaseBuildCallInput,
} from './types';
import { PoolState } from '../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { RemoveLiquidityV2 } from './removeLiquidityV2';
import { RemoveLiquidityV3 } from './removeLiquidityV3';
import { RemoveLiquidityCowAmm } from './removeLiquidityCowAmm';
import { Permit } from '../permitHelper';
import { RemoveLiquidityV2BuildCallInput } from './removeLiquidityV2/types';
import { Hex } from 'viem';

export class RemoveLiquidity implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(public config?: RemoveLiquidityConfig) {}

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, poolState);
        switch (poolState.protocolVersion) {
            case 1: {
                const removeLiquidity = new RemoveLiquidityCowAmm();
                return removeLiquidity.query(
                    input as RemoveLiquidityProportionalInput,
                    poolState,
                );
            }
            case 2: {
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.query(input, poolState);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.query(input, poolState);
            }
        }
    }

    /**
     * It's not possible to query Remove Liquidity Recovery in the same way as
     * other remove liquidity kinds, so a separate handler is required for it.
     * Since it's not affected by fees or anything other than pool balances,
     * it's possible to calculate amountsOut as proportional amounts.
     */
    public async queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidityRecovery(input, poolState);
        switch (poolState.protocolVersion) {
            case 1: {
                const removeLiquidity = new RemoveLiquidityCowAmm();
                return removeLiquidity.queryRemoveLiquidityRecovery();
            }
            case 2: {
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.queryRemoveLiquidityRecovery(
                    input,
                    poolState,
                );
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.queryRemoveLiquidityRecovery(
                    input,
                    poolState,
                );
            }
        }
    }

    public buildCall(
        input:
            | RemoveLiquidityBaseBuildCallInput
            | RemoveLiquidityV2BuildCallInput
            | (RemoveLiquidityBaseBuildCallInput & { userData: Hex }),
    ): RemoveLiquidityBuildCallOutput {
        const isV2Input = 'sender' in input;
        switch (input.protocolVersion) {
            case 1: {
                const removeLiquidity = new RemoveLiquidityCowAmm();
                return removeLiquidity.buildCall(input);
            }
            case 2: {
                if (isV2Input) {
                    const removeLiquidity = new RemoveLiquidityV2(this.config);
                    return removeLiquidity.buildCall(input);
                }
                break;
            }
            case 3: {
                if (!isV2Input) {
                    if (!('userData' in input))
                        throw new Error(
                            'UserData must be provided in buildCall input',
                        );
                    const removeLiquidity = new RemoveLiquidityV3();
                    return removeLiquidity.buildCall(input);
                }
                break;
            }
        }

        throw Error('buildCall input/version mis-match');
    }

    public buildCallWithPermit(
        input:
            | RemoveLiquidityBaseBuildCallInput
            | RemoveLiquidityV2BuildCallInput
            | (RemoveLiquidityBaseBuildCallInput & { userData: Hex }),
        permit: Permit,
    ): RemoveLiquidityBuildCallOutput {
        if (input.protocolVersion === 3) {
            if (!('userData' in input))
                throw new Error('UserData must be provided in buildCall input');
            const removeLiquidity = new RemoveLiquidityV3();
            return removeLiquidity.buildCallWithPermit(input, permit);
        }

        throw Error(
            'buildCall with Permit signatures is only available for v3',
        );
    }
}
