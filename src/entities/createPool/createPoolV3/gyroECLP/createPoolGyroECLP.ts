import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { Address, encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
    CreatePoolV3BaseInput,
} from '../../types';
import { gyroECLPPoolFactoryAbi_V3 } from '@/abi/gyroECLPPoolFactory.V3';
import { GYROECLP_POOL_FACTORY_BALANCER_V3, sortByAddress } from '@/utils';
import { Hex, PoolType, TokenType } from '@/types';

export type EclpParams = {
    alpha: bigint;
    beta: bigint;
    c: bigint;
    s: bigint;
    lambda: bigint;
};

export type Vector2 = {
    x: bigint;
    y: bigint;
};

export type DerivedEclpParams = {
    tauAlpha: Vector2;
    tauBeta: Vector2;
    u: bigint;
    v: bigint;
    w: bigint;
    z: bigint;
    dSq: bigint;
};

export type CreatePoolGyroECLPInput = CreatePoolV3BaseInput & {
    poolType: PoolType.GyroE;
    tokens: {
        address: Address;
        rateProvider: Address;
        tokenType: TokenType;
        paysYieldFees: boolean;
    }[];
    eclpParams: EclpParams;
    derivedEclpParams: DerivedEclpParams;
};

export class CreatePoolGyroECLP implements CreatePoolBase {
    buildCall(input: CreatePoolGyroECLPInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: GYROECLP_POOL_FACTORY_BALANCER_V3[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolGyroECLPInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress,
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            sortedTokenConfigs.map(
                ({ address, rateProvider, tokenType, paysYieldFees }) => ({
                    token: address,
                    tokenType,
                    rateProvider,
                    paysYieldFees,
                }),
            ),
            input.eclpParams,
            input.derivedEclpParams,
            roleAccounts,
            input.swapFeePercentage,
            input.poolHooksContract,
            input.enableDonation,
            input.disableUnbalancedLiquidity,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: gyroECLPPoolFactoryAbi_V3,
            functionName: 'create',
            args,
        });
    }
}
