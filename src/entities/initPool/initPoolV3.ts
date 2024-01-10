import { PoolState } from '../types';
import { InitPoolBase, InitPoolBuildOutput, InitPoolInput } from './types';

export class InitPoolV3 implements InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        console.log(input, poolState);
        throw new Error('Method not implemented.');
    }
}
