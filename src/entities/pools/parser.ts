import { BasePool, BasePoolFactory } from './';
import { WeightedPoolFactory } from './weighted';
import { StablePoolFactory } from './stable';
import { MetaStablePoolFactory } from './metastable';
import { LinearPoolFactory } from './linear';
import { RawPool } from '../../data/types';
import { Token } from "../token";

export class PoolParser {
    private readonly poolFactories: BasePoolFactory[];
    private readonly chainId: number;
    constructor(chainId: number, customPoolFactories: BasePoolFactory[]) {
        this.chainId = chainId;
        this.poolFactories = [
            // custom pool factories take precedence over base factories
            ...customPoolFactories,
            new WeightedPoolFactory(),
            new StablePoolFactory(),
            new MetaStablePoolFactory(),
            new LinearPoolFactory(),
        ];
    }

    public parseRawPools(rawPools: RawPool[]): { pools: BasePool[], tokenMap: Map<string, Token> } {
        const pools: BasePool[] = [];
        const tokenMap = new Map<string, Token>();

        for (const rawPool of rawPools) {
            for (const factory of this.poolFactories) {
                if (factory.isPoolForFactory(rawPool)) {
                    const pool = factory.create(this.chainId, rawPool);

                    for (const token of pool.tokens) {
                        if (!tokenMap.has(token.token.address)) {
                            tokenMap.set(token.token.address, token.token);
                        }
                    }

                    pools.push(pool);

                    break;
                }
            }
        }

        return { pools, tokenMap };
    }
}
