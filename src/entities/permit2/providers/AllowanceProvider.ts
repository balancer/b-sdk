import { permit2Abi } from '@/abi';
import { Address, Client, PublicActions } from 'viem';

export interface AllowanceData {
    amount: bigint;
    nonce: number;
    expiration: number;
}

export class AllowanceProvider {
    constructor(
        private publicClient: Client & PublicActions,
        private permit2Address: Address,
    ) {}

    async getAllowanceData(
        token: Address,
        owner: Address,
        spender: Address,
    ): Promise<AllowanceData> {
        const result = await this.publicClient.readContract({
            abi: permit2Abi,
            address: this.permit2Address,
            functionName: 'allowance',
            args: [owner, token, spender],
        });

        return {
            amount: result[0],
            nonce: result[1],
            expiration: result[2],
        };
    }

    async getAllowance(
        token: Address,
        owner: Address,
        spender: Address,
    ): Promise<bigint> {
        return (await this.getAllowanceData(token, owner, spender)).amount;
    }

    async getNonce(
        token: Address,
        owner: Address,
        spender: Address,
    ): Promise<number> {
        return (await this.getAllowanceData(token, owner, spender)).nonce;
    }

    async getExpiration(
        token: Address,
        owner: Address,
        spender: Address,
    ): Promise<number> {
        return (await this.getAllowanceData(token, owner, spender)).expiration;
    }
}
