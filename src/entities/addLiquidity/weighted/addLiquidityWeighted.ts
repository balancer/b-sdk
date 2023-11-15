import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityBaseQueryOutputV2,
    AddLiquidityBaseQueryOutputV3,
    AddLiquidityWeightedV2Call,
    AddLiquidityWeightedV3Call,
} from '../types';
import { PoolState } from '../../types';
import { AddLiquidityWeightedV2 } from './addLiquidityWeightedV2';
import { AddLiquidityWeightedV3 } from './addLiquidityWeightedV3';

export class AddLiquidityWeighted implements AddLiquidityBase {
    V2: AddLiquidityWeightedV2;
    V3: AddLiquidityWeightedV3;

    constructor() {
        this.V2 = new AddLiquidityWeightedV2();
        this.V3 = new AddLiquidityWeightedV3();
    }
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutputV2 | AddLiquidityBaseQueryOutputV3> {
        if (poolState.balancerVersion === 2) {
            return this.V2.query(input, poolState);
        } else if (poolState.balancerVersion === 3) {
            return this.V3.query(input, poolState);
        }
        throw Error(
            `Unsupported Weighted Version ${poolState.balancerVersion}`,
        );
    }

    public buildCall(
        input: AddLiquidityWeightedV2Call | AddLiquidityWeightedV3Call,
    ): AddLiquidityBuildOutput {
        if (input.balancerVersion === 2) {
            return this.V2.buildCall(input);
        } else if (input.balancerVersion === 3) {
            return this.V3.buildCall(input);
        }
        throw Error('Unsupported Weighted Version');
    }
}
