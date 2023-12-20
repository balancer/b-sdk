import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityCall,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
} from './types';
import { PoolState } from '../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { RemoveLiquidity as RemoveLiquidityV2 } from '../../v2/entities/removeLiquidity';
import { RemoveLiquidity as RemoveLiquidityV3 } from '../../v3/entities/removeLiquidity';

export * from './types';

export class RemoveLiquidity implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(public config?: RemoveLiquidityConfig) {}

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, poolState);
        switch (poolState.balancerVersion) {
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

    public buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput {
        switch (input.balancerVersion) {
            case 2: {
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.buildCall(input);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.buildCall(input);
            }
        }
    }
}
