import { InputValidator } from '../inputValidator/inputValidator';
import { PoolState } from '../types';
import { InitPoolBuildOutput, InitPoolConfig, InitPoolInput } from './types';
import { InitPoolV2 } from './initPoolV2';
import { InitPoolV3 } from './initPoolV3';

export * from './types';

export class InitPool {
    inputValidator: InputValidator = new InputValidator();

    constructor(public config?: InitPoolConfig) {}

    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        this.inputValidator.validateAddLiquidity(input, poolState);
        switch (poolState.vaultVersion) {
            case 2:
                return new InitPoolV2().buildCall(input, poolState);
            case 3:
                return new InitPoolV3().buildCall(input, poolState);
        }
    }
}
