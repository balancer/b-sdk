import { Address } from 'viem';
import { SUBGRAPH_URLS } from '../utils';
import { gql, GraphQLClient } from 'graphql-request';

export interface SubgraphSwap {
    id: string;
    caller: string;
    tokenIn: Address;
    tokenInSym: string;
    tokenOut: Address;
    tokenOutSym: string;
    tokenAmountIn: `${number}`;
    tokenAmountOut: `${number}`;
    valueUSD: string;
    poolId: {
        id: string;
        poolType: string;
    };
    userAddress: {
        id: string;
    };
    timestamp: number;
    tx: string;
}

const PAGE_SIZE = 1000;

export class BatchSwapService {
    private client: GraphQLClient;

    constructor(chainId: number, subgraphUrl?: string) {
        const defaultSubgraphUrl = SUBGRAPH_URLS[chainId];
        const urlToUse = subgraphUrl ?? defaultSubgraphUrl;

        this.client = new GraphQLClient(urlToUse);
    }

    public async getBatchSwaps(pageNumber = 0, afterTimestamp = 0): Promise<SubgraphSwap[][]> {
        const sets: SubgraphSwap[][] = [];
        const { swaps } = await this.client.request<{
            swaps: SubgraphSwap[];
        }>(this.getSwapsQuery(), {
            pageSize: PAGE_SIZE,
            skip: pageNumber * PAGE_SIZE,
            where: {
                timestamp_gt: afterTimestamp,
            },
        });

        const groupedByTxAndUser = this.groupByTxAndUser(swaps);

        for (const group of Object.values(groupedByTxAndUser)) {
            const inMap = this.keyBySwapIn(group);
            const outMap = this.keyBySwapOut(group);
            //start swaps are the tokenIn-tokenAmountIn that doesn't have an out
            const startSwaps = group.filter(swap => !outMap[this.getSwapInKey(swap)]);

            for (const startSwap of startSwaps) {
                const batchSwaps: SubgraphSwap[] = [startSwap];
                let current = startSwap;

                while (inMap[this.getSwapOutKey(current)]) {
                    current = inMap[this.getSwapOutKey(current)];
                    batchSwaps.push(current);
                }

                sets.push(batchSwaps);
            }
        }

        return sets;
    }

    private keyBySwapOut(swaps: SubgraphSwap[]): { [key: string]: SubgraphSwap } {
        const obj: { [key: string]: SubgraphSwap } = {};

        for (const swap of swaps) {
            obj[this.getSwapOutKey(swap)] = swap;
        }

        return obj;
    }

    private keyBySwapIn(swaps: SubgraphSwap[]): { [key: string]: SubgraphSwap } {
        const obj: { [key: string]: SubgraphSwap } = {};

        for (const swap of swaps) {
            obj[this.getSwapInKey(swap)] = swap;
        }

        return obj;
    }

    private getSwapOutKey(swap: SubgraphSwap): string {
        return `${swap.tokenOut}${swap.tokenAmountOut}`;
    }

    private getSwapInKey(swap: SubgraphSwap): string {
        return `${swap.tokenIn}${swap.tokenAmountIn}`;
    }

    private groupByTxAndUser(swaps: SubgraphSwap[]): { [txAndUser: string]: SubgraphSwap[] } {
        const groupedByTxAndUser: { [txAndUser: string]: SubgraphSwap[] } = {};

        for (const swap of swaps) {
            if (!groupedByTxAndUser[`${swap.tx}${swap.userAddress.id}`]) {
                groupedByTxAndUser[`${swap.tx}${swap.userAddress.id}`] = [];
            }

            groupedByTxAndUser[`${swap.tx}${swap.userAddress.id}`].push(swap);
        }

        return groupedByTxAndUser;
    }

    private getSwapsQuery() {
        return gql`
            query swapsQuery(
                $pageSize: Int!
                $skip: Int!
                $where: Swap_filter
                $block: Block_height
            ) {
                swaps(first: $pageSize, skip: $skip, where: $where, block: $block) {
                    id
                    caller
                    tokenIn
                    tokenInSym
                    tokenOut
                    tokenOutSym
                    tokenAmountIn
                    tokenAmountOut
                    valueUSD
                    userAddress {
                        id
                    }
                    poolId {
                        id
                        poolType
                    }
                    timestamp
                    tx
                }
            }
        `;
    }
}
