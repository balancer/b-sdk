import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityCall,
    AddLiquidityConfig,
} from './types';
import { PoolState } from '../types';
import { AddLiquidityV2 } from './addLiquidityV2';
import { AddLiquidityV3 } from './addLiquidityV3';
import { InputValidator } from '../inputValidator/inputValidator';

export class AddLiquidity implements AddLiquidityBase {
    constructor(public config?: AddLiquidityConfig) {}
    private readonly inputValidator: InputValidator = new InputValidator();

    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        this.inputValidator.validateAddLiquidity(input, poolState);
        switch (poolState.vaultVersion) {
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

    buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput {
        // TODO: refactor validators to take v3 into account
        const isV2Input = 'sender' in input;
        if (input.vaultVersion === 3 && isV2Input)
            throw Error('Cannot define sender/recipient in V3');
        if (input.vaultVersion === 2 && !isV2Input)
            throw Error('Sender/recipient must be defined in V2');

        switch (input.vaultVersion) {
            case 2: {
                const addLiquidity = new AddLiquidityV2(this.config);
                return addLiquidity.buildCall(input);
            }
            case 3: {
                const addLiquidity = new AddLiquidityV3();
                return addLiquidity.buildCall(input);
            }
        }
    }
}
