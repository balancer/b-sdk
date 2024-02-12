import { TokenAmount } from '../tokenAmount';
import { SwapKind } from '../../types';
import { ZERO_ADDRESS, NATIVE_ADDRESS } from '../../utils';
import { Address } from 'viem';
import { PriceImpactAmount } from '../priceImpactAmount';
import { Slippage } from '../slippage';
import { Path, SwapBuildOutput, SwapBase } from './types';
import { SwapV2 } from './swapV2';

export * from './types';

// A Swap can be a single or multiple paths
export class Swap {
    private readonly swap: SwapBase;

    public constructor({
        chainId,
        paths,
        swapKind,
    }: { chainId: number; paths: Path[]; swapKind: SwapKind }) {
        if (paths.length === 0)
            throw new Error('Invalid swap: must contain at least 1 path.');

        switch (paths[0].balancerVersion) {
            case 2:
                this.swap = new SwapV2({ chainId, paths, swapKind });
                return;
            case 3:
                throw new Error('Unsupported Balancer Protocol Version');
        }
    }

    public get quote(): TokenAmount {
        return this.swap.swapKind === SwapKind.GivenIn
            ? this.outputAmount
            : this.inputAmount;
    }

    public get inputAmount(): TokenAmount {
        return this.swap.inputAmount;
    }

    public get outputAmount(): TokenAmount {
        return this.swap.outputAmount;
    }

    // rpcUrl is optional, but recommended to prevent rate limiting
    public async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        return this.swap.query(rpcUrl, block);
    }

    public queryCallData(): string {
        return this.swap.queryCallData();
    }

    public get priceImpact(): PriceImpactAmount {
        throw new Error('Price Impact still to be implemented');
    }

    /**
     * Takes a slippage acceptable by the user and returns the limits for a swap to be executed
     *
     * @param slippage percentage: 5 for 5%
     * @param expectedAmount is the amount that the user expects to receive or send, can be obtained from swap.query()
     * @returns
     */
    limits(slippage: Slippage, expectedAmount: TokenAmount): bigint[] {
        const limits = new Array(this.swap.assets.length).fill(0n);
        let limitAmount: bigint;
        if (this.swap.swapKind === SwapKind.GivenIn) {
            limitAmount = slippage.applyTo(expectedAmount.amount, -1);
        } else {
            limitAmount = slippage.applyTo(expectedAmount.amount);
        }

        if (!this.swap.isBatchSwap) {
            return [limitAmount];
        }

        for (let i = 0; i < this.swap.assets.length; i++) {
            if (
                this.swap.assets[i] === this.inputAmount.token.address ||
                (this.swap.assets[i] === ZERO_ADDRESS &&
                    this.inputAmount.token.address === NATIVE_ADDRESS)
            ) {
                if (this.swap.swapKind === SwapKind.GivenIn) {
                    limits[i] = this.inputAmount.amount;
                } else {
                    limits[i] = limitAmount;
                }
            }
            if (
                this.swap.assets[i] === this.outputAmount.token.address ||
                (this.swap.assets[i] === ZERO_ADDRESS &&
                    this.outputAmount.token.address === NATIVE_ADDRESS)
            ) {
                if (this.swap.swapKind === SwapKind.GivenIn) {
                    limits[i] = -1n * limitAmount;
                } else {
                    limits[i] = -1n * this.outputAmount.amount;
                }
            }
        }

        return limits;
    }

    /**
     * Returns the transaction data to be sent to the vault contract
     *
     * @param limits calculated from swap.limits()
     * @param deadline unix timestamp
     * @param sender address of the sender
     * @param recipient defaults to sender
     * @returns
     */
    buildCall(
        limits: bigint[],
        deadline: bigint,
        sender: Address,
        recipient = sender,
    ): SwapBuildOutput {
        return this.swap.buildCall(limits, deadline, sender, recipient);
    }
}
