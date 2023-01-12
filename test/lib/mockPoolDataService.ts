import { PoolDataService, SubgraphPool } from '../../src/poolProvider';

export class MockPoolDataService implements PoolDataService {
  constructor(private pools: SubgraphPool[] = []) {}

  public async getPools(): Promise<SubgraphPool[]> {
    return this.pools;
  }

  public setPools(pools: SubgraphPool[]): void {
    this.pools = pools;
  }
}

export const mockPoolDataService = new MockPoolDataService();
