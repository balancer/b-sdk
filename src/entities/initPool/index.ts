import { InputValidator } from '../inputValidator/inputValidator';
import { PoolState } from '../types';
import {
    InitPoolBuildOutput,
    InitPoolConfig,
    InitPoolInput,
    InitPoolInputV2,
    InitPoolInputV3,
} from './types';
import { InitPoolV2 } from './initPoolV2';
import { InitPoolV3 } from './initPoolV3';

export * from './types';

export class InitPool {
    inputValidator: InputValidator = new InputValidator();

    constructor(public config?: InitPoolConfig) {}

    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        switch (poolState.balancerVersion) {
            case 2:
                this.inputValidator.validateAddLiquidity(
                    input as InitPoolInputV2,
                    poolState,
                );
                return new InitPoolV2().buildCall(
                    input as InitPoolInputV2,
                    poolState,
                );
            case 3:
                return new InitPoolV3().buildCall(
                    input as InitPoolInputV3,
                    poolState,
                );
        }
    }
}
