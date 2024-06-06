import {
    AddLiquidityBase,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityBuildCallInput,
    AddLiquidityConfig,
} from './types';
import { PoolState } from '../types';
import { AddLiquidityV2 } from './addLiquidityV2';
import { AddLiquidityV3 } from './addLiquidityV3';
import { InputValidator } from '../inputValidator/inputValidator';
import { AddLiquidityCowAmm } from './addLiquidityCowAmm';

export class AddLiquidity implements AddLiquidityBase {
    constructor(public config?: AddLiquidityConfig) {}
    private readonly inputValidator: InputValidator = new InputValidator();

    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        this.inputValidator.validateAddLiquidity(input, poolState);
        switch (poolState.vaultVersion) {
            case 0: {
                const addLiquidity = new AddLiquidityCowAmm();
                return addLiquidity.query(input, poolState);
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
        switch (input.vaultVersion) {
            case 0: {
                // TODO: check if we need to be more restrictive with input type mismatch here
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
}
