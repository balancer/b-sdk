import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityBuildCallInput,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
} from './types';
import { PoolState, PoolStateWithBalances } from '../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { RemoveLiquidityV2 } from './removeLiquidityV2';
import { RemoveLiquidityV3 } from './removeLiquidityV3';

export class RemoveLiquidity implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(public config?: RemoveLiquidityConfig) {}

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, poolState);
        switch (poolState.vaultVersion) {
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

    /**
     * It's not possible to query Remove Liquidity Recovery in the same way as
     * other remove liquidity kinds, so a separate handler is required for it.
     * Since it's not affected by fees or anything other than pool balances,
     * it's possible to calculate amountsOut as proportional amounts.
     */
    public queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): RemoveLiquidityQueryOutput {
        this.inputValidator.validateRemoveLiquidityRecovery(
            input,
            poolStateWithBalances,
        );
        switch (poolStateWithBalances.vaultVersion) {
            case 2: {
                const removeLiquidity = new RemoveLiquidityV2(this.config);
                return removeLiquidity.queryRemoveLiquidityRecovery(
                    input,
                    poolStateWithBalances,
                );
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityV3();
                return removeLiquidity.queryRemoveLiquidityRecovery(
                    input,
                    poolStateWithBalances,
                );
            }
        }
    }

    public buildCall(
        input: RemoveLiquidityBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        // TODO: refactor validators to take v3 into account
        const isV2Input = 'sender' in input;
        if (input.vaultVersion === 3 && isV2Input)
            throw Error('Cannot define sender/recipient in V3');
        if (input.vaultVersion === 2 && !isV2Input)
            throw Error('Sender/recipient must be defined in V2');

        switch (input.vaultVersion) {
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
