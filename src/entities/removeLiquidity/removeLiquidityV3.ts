import {
    PoolState,
    RemoveLiquidityBase,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityCall,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
} from '@/entities';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        console.log(input, poolState);
        throw new Error('Method not implemented.');
    }

    public buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
