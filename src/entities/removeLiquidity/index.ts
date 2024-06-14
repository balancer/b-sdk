import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityBuildCallInput,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
    RemoveLiquidityProportionalInput,
} from './types';
import { PoolState, PoolStateWithBalances } from '../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { RemoveLiquidityV2 } from './removeLiquidityV2';
import { RemoveLiquidityV3 } from './removeLiquidityV3';
import { RemoveLiquidityCowAmm } from './removeLiquidityCowAmm';
import { PermitApproval } from '../permit';
import { Hex } from '@/types';

export class RemoveLiquidity implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(public config?: RemoveLiquidityConfig) {}

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, poolState);
        switch (poolState.vaultVersion) {
            case 0: {
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
        poolState: PoolStateWithBalances,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidityRecovery(input, poolState);
        switch (poolState.vaultVersion) {
            case 0: {
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
        input: RemoveLiquidityBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const isV2Input = 'sender' in input;
        switch (input.vaultVersion) {
            case 0: {
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
                    const removeLiquidity = new RemoveLiquidityV3();
                    return removeLiquidity.buildCall(input);
                }
                break;
            }
        }

        throw Error('buildCall input/version mis-match');
    }

    public buildCallWithPermit(
        input: RemoveLiquidityBuildCallInput,
        permitBatch: PermitApproval,
        permitSignature: Hex,
    ): RemoveLiquidityBuildCallOutput {
        if (input.vaultVersion === 3) {
            const removeLiquidity = new RemoveLiquidityV3();
            return removeLiquidity.buildCallWithPermit(
                input,
                permitBatch,
                permitSignature,
            );
        }

        throw Error(
            'buildCall with Permit signatures is only available for v3',
        );
    }
}
