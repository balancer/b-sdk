import {
    AddLiquidityBase,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityBuildCallInput,
    AddLiquidityConfig,
    AddLiquidityProportionalInput,
} from './types';
import { PoolState } from '../types';
import { AddLiquidityV2 } from './addLiquidityV2';
import { AddLiquidityV3 } from './addLiquidityV3';
import { InputValidator } from '../inputValidator/inputValidator';
import { AddLiquidityCowAmm } from './addLiquidityCowAmm';
import { Permit2 } from '../permit2';

export class AddLiquidity implements AddLiquidityBase {
    constructor(public config?: AddLiquidityConfig) {}
    private readonly inputValidator: InputValidator = new InputValidator();

    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        this.inputValidator.validateAddLiquidity(input, poolState);
        switch (poolState.protocolVersion) {
            case 1: {
                const addLiquidity = new AddLiquidityCowAmm();
                return addLiquidity.query(
                    input as AddLiquidityProportionalInput,
                    poolState,
                );
            }
            case 2: {
                const addLiquidity = new AddLiquidityV2(this.config);
                return addLiquidity.query(input, poolState);
            }
            case 3: {
                const addLiquidity = new AddLiquidityV3();
                return addLiquidity.query(input, poolState);
            }
        }
    }

    buildCall(input: AddLiquidityBuildCallInput): AddLiquidityBuildCallOutput {
        switch (input.protocolVersion) {
            case 1: {
                const addLiquidity = new AddLiquidityCowAmm();
                return addLiquidity.buildCall(input);
            }
            case 2: {
                if ('sender' in input) {
                    const addLiquidity = new AddLiquidityV2(this.config);
                    return addLiquidity.buildCall(input);
                }
                break;
            }
            case 3: {
                if (!('sender' in input)) {
                    const addLiquidity = new AddLiquidityV3();
                    return addLiquidity.buildCall(input);
                }
                break;
            }
        }

        throw Error('buildCall input/version mis-match');
    }

    buildCallWithPermit2(
        input: AddLiquidityBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityBuildCallOutput {
        if (input.protocolVersion === 3) {
            const addLiquidity = new AddLiquidityV3();
            return addLiquidity.buildCallWithPermit2(input, permit2);
        }
        throw Error(
            'buildCall with Permit2 signatures is only available for v3',
        );
    }
}
