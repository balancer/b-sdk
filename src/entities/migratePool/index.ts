import { poolTypeProtocolVersionError } from '@/utils';
import {
    MigratePoolBase,
    MigratePoolInput,
    MigratePoolQueryInput,
    MigratePoolBuildCallOutput,
    MigratePoolQueryOutput,
} from './types';
import { MigratePoolLiquidityBootstrapping } from './liquidityBootstrapping';

export class MigratePool implements MigratePoolBase {
    private readonly migratePoolTypes: Record<string, MigratePoolBase> = {};

    constructor() {
        this.migratePoolTypes = {
            LiquidityBootstrapping: new MigratePoolLiquidityBootstrapping(),
        };
    }

    private getMigratePool(poolType: string): MigratePoolBase {
        if (!this.migratePoolTypes[poolType]) {
            throw poolTypeProtocolVersionError('Migrate Pool', poolType, 3);
        }
        return this.migratePoolTypes[poolType];
    }

    public query(
        input: MigratePoolQueryInput,
        block?: bigint,
    ): Promise<MigratePoolQueryOutput> {
        return this.getMigratePool(input.poolType).query(input, block);
    }

    public buildCall(input: MigratePoolInput): MigratePoolBuildCallOutput {
        return this.getMigratePool(input.poolType).buildCall(input);
    }
}
