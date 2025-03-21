import {
    RemoveLiquidityBase,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityV3BuildCallInput,
} from './types';
import { PoolState } from '../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { RemoveLiquidityV2 } from './removeLiquidityV2';
import { RemoveLiquidityV3 } from './removeLiquidityV3';
import { RemoveLiquidityCowAmm } from './removeLiquidityCowAmm';
import { Permit } from '../permitHelper';
import { RemoveLiquidityV2BuildCallInput } from './removeLiquidityV2/types';
import {
    exceedingParameterError,
    missingParameterError,
    protocolVersionError,
} from '@/utils';

export class RemoveLiquidity implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(public config?: RemoveLiquidityConfig) {}

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
        block?: bigint,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, poolState);
        switch (poolState.protocolVersion) {
            case 1: {
                const removeLiquidity = new RemoveLiquidityCowAmm();
                return removeLiquidity.query(
                    input as RemoveLiquidityProportionalInput,
                    poolState,
                    block,
                );
            }
            case 2: {
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.query(input, poolState);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.query(input, poolState, block);
            }
        }
    }

    public buildCall(
        input:
            | RemoveLiquidityV2BuildCallInput
            | RemoveLiquidityV3BuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const isV2Input = 'sender' in input || 'recipient' in input;
        switch (input.protocolVersion) {
            case 1: {
                const removeLiquidity = new RemoveLiquidityCowAmm();
                return removeLiquidity.buildCall(input);
            }
            case 2: {
                if (!isV2Input) {
                    throw missingParameterError(
                        'Remove LiquiditybuildCall',
                        'sender or recipient',
                        input.protocolVersion,
                    );
                }
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.buildCall(input);
            }
            case 3: {
                if (!('userData' in input)) {
                    throw missingParameterError(
                        'Remove Liquidity buildCall',
                        'userData',
                        input.protocolVersion,
                    );
                }
                if (isV2Input) {
                    throw exceedingParameterError(
                        'Remove Liquidity buildCall',
                        'sender or recipient',
                        input.protocolVersion,
                    );
                }
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.buildCall(input);
            }
        }
    }

    public buildCallWithPermit(
        input:
            | RemoveLiquidityV2BuildCallInput
            | RemoveLiquidityV3BuildCallInput,
        permit: Permit,
    ): RemoveLiquidityBuildCallOutput {
        if (input.protocolVersion !== 3) {
            throw protocolVersionError(
                'Remove Liquidity buildCallWithPermit',
                input.protocolVersion,
            );
        }

        if (!('userData' in input)) {
            throw missingParameterError(
                'Remove Liquidity buildCallWithPermit',
                'userData',
                input.protocolVersion,
            );
        }

        const removeLiquidity = new RemoveLiquidityV3();
        return removeLiquidity.buildCallWithPermit(input, permit);
    }
}
