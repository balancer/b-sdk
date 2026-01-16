import { InputValidatorBase } from '../inputValidatorBase';
import { PoolState, PoolStateWithBalances } from '../../types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { CreatePoolLiquidityBootstrappingFixedPriceInput } from '../../createPool/types';
import { AddLiquidityInput } from '../../addLiquidity/types';
import { InitPoolInput } from '../../initPool/types';

import { isSameAddress, SDKError } from '@/utils';
import { zeroAddress } from 'viem';

export class InputValidatorLiquidityBootstrappingFixedPrice extends InputValidatorBase {
    // TODO
    validateAddLiquidity(
        _addLiquidityInput: AddLiquidityInput,
        _poolState: PoolState,
    ): void {}
    // TODO
    validateRemoveLiquidity(
        _removeLiquidityInput: RemoveLiquidityInput,
        _poolState: PoolState,
    ): void {}
    // TODO
    validateRemoveLiquidityRecovery(
        _removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput,
        _poolStateWithBalances: PoolStateWithBalances,
    ): void {}
    
    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void {
        // Call base validation first
        super.validateInitPool(initPoolInput, poolState);

        // Fixed price LBPs must be initialized with project tokens only (seedless)
        // Contract requirement: projectAmount > 0 && reserveAmount == 0
        // We need to identify which token is project and which is reserve
        // Since poolState doesn't contain this info, we validate based on the contract's requirement:
        // - Exactly one token should have amount > 0 (project token)
        // - Exactly one token should have amount == 0 (reserve token)
        // - There should be exactly 2 tokens
        
        if (poolState.tokens.length !== 2) {
            throw new SDKError(
                'Input Validation',
                'Init Pool',
                'Fixed price LBP pools must have exactly 2 tokens',
            );
        }

        if (initPoolInput.amountsIn.length !== 2) {
            throw new SDKError(
                'Input Validation',
                'Init Pool',
                'Must provide amounts for exactly 2 tokens',
            );
        }

        // Match amounts to tokens by address
        const amountsByToken = new Map<string, bigint>();
        for (const amount of initPoolInput.amountsIn) {
            amountsByToken.set(amount.address.toLowerCase(), amount.rawAmount);
        }

        // Get amounts for each pool token
        const tokenAmounts = poolState.tokens.map((token) => {
            const amount = amountsByToken.get(token.address.toLowerCase());
            if (amount === undefined) {
                throw new SDKError(
                    'Input Validation',
                    'Init Pool',
                    `Missing amount for token ${token.address}`,
                );
            }
            return { address: token.address, amount };
        });

        // Validate: exactly one token has amount > 0 (project token), one has amount == 0 (reserve token)
        const nonZeroAmounts = tokenAmounts.filter((t) => t.amount > 0n);
        const zeroAmounts = tokenAmounts.filter((t) => t.amount === 0n);

        if (nonZeroAmounts.length !== 1) {
            throw new SDKError(
                'Input Validation',
                'Init Pool',
                'Fixed price LBPs must be initialized with exactly one token (project token) with amount > 0',
            );
        }

        if (zeroAmounts.length !== 1) {
            throw new SDKError(
                'Input Validation',
                'Init Pool',
                'Fixed price LBPs must be initialized with exactly one token (reserve token) with amount == 0',
            );
        }
    }
    validateCreatePool(
        input: CreatePoolLiquidityBootstrappingFixedPriceInput,
    ): void {
        const params = input.fixedPriceLbpParams;

        // Validate addresses are not zero (contract requirement)
        if (params.owner === zeroAddress) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Owner address cannot be zero',
            );
        }
        if (params.projectToken === zeroAddress) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Project token address cannot be zero',
            );
        }
        if (params.reserveToken === zeroAddress) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Reserve token address cannot be zero',
            );
        }

        // Validate project token rate for fixed price LBPs (contract requirement: projectTokenRate != 0)
        if (params.projectTokenRate <= 0n) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Project token rate must be greater than 0',
            );
        }

        // Validate swap fee percentage bounds (contract: MIN = 0, MAX = 10%)
        // FixedPriceLBPool.sol: _MIN_SWAP_FEE_PERCENTAGE = 0, _MAX_SWAP_FEE_PERCENTAGE = 10e16
        const MAX_SWAP_FEE_PERCENTAGE = BigInt(10e16); // 10%
        if (input.swapFeePercentage > MAX_SWAP_FEE_PERCENTAGE) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                `Swap fee percentage cannot exceed ${MAX_SWAP_FEE_PERCENTAGE} (10%)`,
            );
        }

        // Validate start and end times
        if (params.startTimestamp >= params.endTimestamp) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start time must be before end time',
            );
        }
        // cannot be in the past - technically allowed on the sc side.
        // will simply move startTime to now.
        if (
            params.startTimestamp <
            BigInt(Math.floor(Date.now() / 1000))
        ) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Start time must be in the future',
            );
        }
        // tokens cannot be the same (contract requirement)
        if (
            isSameAddress(
                params.projectToken,
                params.reserveToken,
            )
        ) {
            throw new SDKError(
                'Input Validation',
                'Create Pool',
                'Tokens must be different',
            );
        }
    }
}
