import { createPublicClient, encodeFunctionData, http } from 'viem';
import {
    BaseJoin,
    JoinCallInput,
    JoinInput,
    JoinQueryResult,
    PoolState,
} from '..';
import { Address } from '../../../types';
import {
    BALANCER_HELPERS,
    BALANCER_VAULT,
    CHAINS,
    ZERO_ADDRESS,
} from '../../../utils';
import { WeightedEncoder } from '../../encoders/weighted';
import { TokenAmount } from '../../tokenAmount';
import { balancerHelpersAbi } from '../../../abi/balancerHelpers';
import { Token } from '../../token';
import { vaultAbi } from '../../../abi';

export class WeightedJoin implements BaseJoin {
    // TODO - Probably not needed
    getInstance(): WeightedJoin {
        return new WeightedJoin();
    }

    public async query(
        input: JoinInput,
        poolState: PoolState,
    ): Promise<JoinQueryResult> {
        // TODO - This would need extended to work with relayer

        this.checkInputs(input, poolState);

        // Initialize join parameters
        let maxAmountsIn = Array(poolState.tokens.length).fill(0n);
        let userData: Address;
        const poolAssets = poolState.tokens.map((t) => t.address);

        switch (input.kind) {
            case 'init': {
                maxAmountsIn = this.getAmountsIn(input, poolAssets);
                userData = WeightedEncoder.joinInit(maxAmountsIn);
                break;
            }
            case 'proportional':
            case 'unbalanced':
            case 'singleAsset': {
                maxAmountsIn = this.getAmountsIn(input, poolAssets);
                const bptOut = 0n;
                userData = WeightedEncoder.joinGivenIn(maxAmountsIn, bptOut);
                break;
            }
            case 'exactOut': {
                userData = WeightedEncoder.joinGivenOut(input.bptOut.amount);
                break;
            }
            default:
                throw new Error('Invalid join kind');
        }

        const queryArgs = this.getJoinParameters({
            poolId: poolState.id,
            assets: poolAssets,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn,
            userData,
        });

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        const {
            result: [queryBptOut, queryAmountsIn],
        } = await client.simulateContract({
            address: BALANCER_HELPERS[input.chainId],
            abi: balancerHelpersAbi,
            functionName: 'queryJoin',
            args: queryArgs,
        });

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryBptOut);

        const poolTokens = poolState.tokens.map(
            (token) => new Token(input.chainId, token.address, token.decimals),
        );
        const amountsIn = queryAmountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(poolTokens[i], a),
        );

        return {
            joinKind: input.kind,
            id: poolState.id,
            assets: poolAssets,
            bptOut,
            amountsIn,
        };
    }

    public buildCall(input: JoinCallInput): {
        call: Address;
        to: Address;
        value: bigint;
        minBptOut: bigint;
    } {
        const maxAmountsIn: bigint[] = [];
        const userData: Address = ZERO_ADDRESS;
        const minBptOut = input.bptOut.amount;

        // switch (input.joinKind) {
        //     case 'Init': {
        //         maxAmountsIn = input.amountsIn.map((a) => a.amount);
        //         userData = WeightedEncoder.joinInit(maxAmountsIn);
        //         break;
        //     }
        //     case 'GivenIn': {
        //         maxAmountsIn = input.amountsIn.map((a) => a.amount);
        //         minBptOut = input.slippage.removeFrom(input.bptOut.amount);
        //         userData = WeightedEncoder.joinGivenIn(maxAmountsIn, minBptOut);
        //         break;
        //     }
        //     case 'GivenOut': {
        //         maxAmountsIn = input.amountsIn.map((a) =>
        //             input.slippage.applyTo(a.amount),
        //         );
        //         userData = WeightedEncoder.joinGivenOut(input.bptOut.amount);
        //         break;
        //     }
        //     default:
        //         throw new Error('Invalid join kind');
        // }

        const queryArgs = this.getJoinParameters({
            poolId: input.id,
            assets: input.assets,
            sender: input.sender,
            recipient: input.recipient,
            maxAmountsIn,
            userData,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args: queryArgs,
        });

        // Encode data
        return {
            call,
            to: BALANCER_VAULT,
            value: 0n, // TODO: ETH value when joining with ETH
            minBptOut,
        };
    }

    private getJoinParameters({
        poolId,
        assets,
        sender,
        recipient,
        maxAmountsIn,
        userData,
    }: {
        poolId: Address;
        assets: readonly Address[];
        sender: Address;
        recipient: Address;
        maxAmountsIn: readonly bigint[];
        userData: Address;
    }) {
        const joinPoolRequest = {
            assets, // with BPT
            maxAmountsIn, // with BPT
            userData, // wihtout BPT
            fromInternalBalance: false,
        };

        return [poolId, sender, recipient, joinPoolRequest] as const;
    }

    private checkInputs(input: JoinInput, poolState: PoolState) {
        const poolAssets = poolState.tokens.map((t) => t.address);
        switch (input.kind) {
            case 'proportional': {
                if (!poolAssets.includes(input.refAmountIn.token.address)) {
                    throw new Error('Reference token not in pool');
                }
            }
            break;
            // TODO: think about a way to consolidate checks so this doesn't become uneccessarily hard to maintain
            default:
                break;
        }
    }

    private getAmountsIn(input: JoinInput, poolAssets: string[]): bigint[] {
        return poolAssets.map((asset) => {
            let tokenIn: TokenAmount | undefined;
            switch (input.kind) {
                case 'init':
                    tokenIn = input.initAmountsIn.find(
                        (t) => t.token.address === asset,
                    );
                    break;
                case 'proportional':
                    if (input.refAmountIn.token.address === asset)
                        tokenIn = input.refAmountIn;
                    // TODO: calculate proportional amounts based on reference token
                    break;
                case 'unbalanced':
                    tokenIn = input.amountsIn.find(
                        (t) => t.token.address === asset,
                    );
                    break;
                case 'singleAsset':
                    if (input.amountIn.token.address === asset)
                        tokenIn = input.amountIn;
                    break;
            }
            return tokenIn?.amount ?? 0n;
        });
    }
}
