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

        // infer join kind by input tokens
        const joinKind = this.getJoinKind(input, poolState.address);

        // Initialize join parameters
        let maxAmountsIn = Array(poolState.tokens.length).fill(0n);
        let userData: Address;
        const poolAssets = poolState.tokens.map((t) => t.address);

        switch (joinKind) {
            case 'Init': {
                maxAmountsIn = this.getAmountsIn(input, poolAssets);
                userData = WeightedEncoder.joinInit(maxAmountsIn);
                break;
            }
            case 'GivenIn': {
                maxAmountsIn = this.getAmountsIn(input, poolAssets);
                const bptOut = 0n;
                userData = WeightedEncoder.joinGivenIn(maxAmountsIn, bptOut);
                break;
            }
            case 'GivenOut': {
                const bptOut = input.tokenAmounts[0].amount;
                userData = WeightedEncoder.joinGivenOut(bptOut);
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
            joinKind,
            id: poolState.id,
            assets: poolAssets,
            bptOut,
            amountsIn,
        };
    }

    public buildCall(input: JoinCallInput): {
        call: string;
        to: Address;
        value: string;
    } {
        let maxAmountsIn: bigint[];
        let userData: Address;

        switch (input.joinKind) {
            case 'Init': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount);
                userData = WeightedEncoder.joinInit(maxAmountsIn);
                break;
            }
            case 'GivenIn': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount);
                const minBptOut = input.bptOut.amount; // TODO sub slippage here
                userData = WeightedEncoder.joinGivenIn(maxAmountsIn, minBptOut);
                break;
            }
            case 'GivenOut': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount); // TODO add slippage here
                userData = WeightedEncoder.joinGivenOut(input.bptOut.amount);
                break;
            }
            default:
                throw new Error('Invalid join kind');
        }

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
            value: '0', // TODO: ETH value when joining with ETH
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
        const tokensIn = input.tokenAmounts.map((t) => t.token.address);
        const poolAssets = poolState.tokens.map((t) => t.address);
        if (input.tokenAmounts.length === 0) {
            throw new Error('Must specify at least one input');
        } else if (tokensIn.some((t) => !poolAssets.includes(t))) {
            throw new Error('Input token not in pool');
        } else if (tokensIn.includes(poolState.address)) {
            if (tokensIn.length > 1) {
                throw new Error('Cannot join with BPT and other tokens');
            } else if (input.isInit) {
                throw new Error('Cannot init with BPT');
            }
        }
    }

    private getJoinKind(input: JoinInput, poolAddress: Address): string {
        const tokensIn = input.tokenAmounts.map((t) => t.token.address);
        if (tokensIn.includes(poolAddress)) {
            return 'GivenOut';
        } else {
            return input.isInit ? 'Init' : 'GivenIn';
        }
    }

    private getAmountsIn(input: JoinInput, poolAssets: string[]): bigint[] {
        return poolAssets.map((asset) => {
            let amountIn = 0n;
            const tokenIn = input.tokenAmounts.find(
                (t) => t.token.address === asset,
            );
            if (tokenIn) {
                amountIn = tokenIn.amount;
            }
            return amountIn;
        });
    }
}
