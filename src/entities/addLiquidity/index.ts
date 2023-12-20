import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityCall,
    AddLiquidityConfig,
} from './types';
import { PoolState } from '../types';
import { AddLiquidity as AddLiquidityV2 } from '../../v2/entities/addLiquidity';
import { AddLiquidity as AddLiquidityV3 } from '../../v3/entities/addLiquidity';
import { InputValidator } from '../inputValidator/inputValidator';

export * from './types';

export class AddLiquidity implements AddLiquidityBase {
    constructor(public config?: AddLiquidityConfig) {}
    private readonly inputValidator: InputValidator = new InputValidator();

    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        this.inputValidator.validateAddLiquidity(input, poolState);
        switch (poolState.balancerVersion) {
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
        switch (input.balancerVersion) {
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
