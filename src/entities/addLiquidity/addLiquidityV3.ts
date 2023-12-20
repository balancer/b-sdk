import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityCall,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    PoolState,
} from '@/entities';

export class AddLiquidityV3 implements AddLiquidityBase {
    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        console.log(input, poolState);

        throw new Error('Method not implemented.');
    }

    buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
