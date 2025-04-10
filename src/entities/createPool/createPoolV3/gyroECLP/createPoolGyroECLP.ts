import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
    CreatePoolV3BaseInput,
    TokenConfig,
} from '../../types';
import { gyroECLPPoolFactoryAbiExtended } from '@/abi';
import { balancerV3Contracts, sortByAddress } from '@/utils';
import { Hex, PoolType } from '@/types';
import { Big } from 'big.js';

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
    tokens: TokenConfig[];
    eclpParams: EclpParams;
    derivedEclpParams: DerivedEclpParams;
};

export class CreatePoolGyroECLP implements CreatePoolBase {
    buildCall(input: CreatePoolGyroECLPInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: balancerV3Contracts.GyroECLPPoolFactory[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolGyroECLPInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const tokens = sortedTokenConfigs.map(({ address, ...rest }) => ({
            token: address,
            ...rest,
        }));

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress,
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            tokens,
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
            abi: gyroECLPPoolFactoryAbiExtended,
            functionName: 'create',
            args,
        });
    }
}

export function calcDerivedParams(params: EclpParams): DerivedEclpParams {
    const D18 = 10n ** 18n; // 18 decimal precision is how params are stored
    const D38 = 10n ** 38n; // 38 decimal precision for derived param return values
    const D100 = 10n ** 100n; // 100 decimal precision for internal calculations

    let { alpha, beta, c, s, lambda } = params; // params start at 18

    // scale from 18 to 100
    c = (c * D100) / D18;
    s = (s * D100) / D18;
    lambda = (lambda * D100) / D18;
    alpha = (alpha * D100) / D18;
    beta = (beta * D100) / D18;

    const dSq = (c * c + s * s) / D100; // divide by D100 to keep at 100 decimal precision
    const d = bigIntSqrt(dSq) * 10n ** 50n; // square root reduces precision to 50 decimal places?

    // dAlpha and dBeta result in 53 decimal precision?
    const dAlpha =
        D100 /
        bigIntSqrt(
            (((c * D100) / d + (alpha * s) / d) ** 2n * D100) / lambda ** 2n +
                ((alpha * c) / d - (s * D100) / d) ** 2n / D100,
        );
    const dBeta =
        D100 /
        bigIntSqrt(
            (((c * D100) / d + (beta * s) / d) ** 2n * D100) / lambda ** 2n +
                ((beta * c) / d - (s * D100) / d) ** 2n / D100,
        );

    const tauAlpha: Vector2 = {
        // weird 50 scaling necessary to get back to 100 because of dAlpha precision?
        x: (((alpha * c) / D100 - s) * dAlpha) / 10n ** 50n,
        y: ((((c + (s * alpha) / D100) * dAlpha) / 10n ** 50n) * D100) / lambda,
    };
    const tauBeta: Vector2 = {
        // weird 50 scaling necessary to get back to 100 because of dBeta precision?
        x: (((beta * c) / D100 - s) * dBeta) / 10n ** 50n,
        y: ((((c + (s * beta) / D100) * dBeta) / 10n ** 50n) * D100) / lambda,
    };

    // Each multiplication must be scaled down by D100
    const w = (s * c * (tauBeta.y - tauAlpha.y)) / (D100 * D100);
    const z = (c * c * tauBeta.x + s * s * tauAlpha.x) / (D100 * D100);
    const u = (s * c * (tauBeta.x - tauAlpha.x)) / (D100 * D100);
    const v = (s * s * tauBeta.y + c * c * tauAlpha.y) / (D100 * D100);

    // all return values scaled to 38 decimal places
    return {
        tauAlpha: {
            x: (tauAlpha.x * D38) / D100,
            y: (tauAlpha.y * D38) / D100,
        },
        tauBeta: {
            x: (tauBeta.x * D38) / D100,
            y: (tauBeta.y * D38) / D100,
        },
        u: (u * D38) / D100,
        v: (v * D38) / D100,
        w: (w * D38) / D100,
        z: (z * D38) / D100,
        dSq: (dSq * D38) / D100,
    };
}

function bigIntSqrt(val: bigint): bigint {
    return BigInt(new Big(val.toString()).sqrt().toFixed(0));
}
