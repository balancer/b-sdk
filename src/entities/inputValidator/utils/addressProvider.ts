import { balancerV3Contracts } from '@/utils';
import { SDKError } from '@/utils';
import { ChainId } from '@/utils/constants';
import { Hex, Address } from '@/types';

/**
 * Represents a mapping from ChainId to contract address.
 * Not all contracts are deployed on every chain, so this is a partial record.
 */
type ContractAddresses = Partial<Record<ChainId, Address>>;

/**
 * Utility class for retrieving Balancer V3 contract addresses for a given chain.
 * Provides static methods for each contract type, with validation and error handling.
 */
export class AddressProvider {
    /**
     * Looks up the contract name in balancerV3Contracts by reference.
     * Used internally for error reporting.
     * @param contract - The contract address mapping to look up.
     * @returns The contract name as a string, or 'UnknownContract' if not found.
     * @private
     */
    private static lookupContractName(contract: ContractAddresses): string {
        return (
            Object.entries(balancerV3Contracts).find(
                ([, value]) => value === contract,
            )?.[0] || 'UnknownContract'
        );
    }

    private static getAddress(
        contract: ContractAddresses,
        chainId: ChainId,
    ): Hex {
        const address = contract[chainId];
        if (!address) {
            const contractName = AddressProvider.lookupContractName(contract);
            throw new SDKError(
                'AddressProvider',
                `get${contractName}`,
                `Address not found for ${contractName} on chainId: ${chainId}`,
            );
        }
        return address as Hex;
    }

    static BatchRouter(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.BatchRouter,
            chainId,
        );
    }
    static BufferRouter(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.BufferRouter,
            chainId,
        );
    }
    static CompositeLiquidityRouter(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.CompositeLiquidityRouter,
            chainId,
        );
    }
    static GyroECLPPoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.GyroECLPPoolFactory,
            chainId,
        );
    }
    static LBPoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.LBPoolFactory,
            chainId,
        );
    }
    static LBPoolMigrationRouter(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.LBPMigrationRouter,
            chainId,
        );
    }
    static ReClammPoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.ReClammPoolFactory,
            chainId,
        );
    }
    static Router(chainId: ChainId): Hex {
        return AddressProvider.getAddress(balancerV3Contracts.Router, chainId);
    }
    static UnbalancedAddViaSwapRouter(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.UnbalancedAddViaSwapRouter,
            chainId,
        );
    }
    static StablePoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.StablePoolFactory,
            chainId,
        );
    }
    static StableSurgePoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.StableSurgePoolFactory,
            chainId,
        );
    }
    static Vault(chainId: ChainId): Hex {
        return AddressProvider.getAddress(balancerV3Contracts.Vault, chainId);
    }
    static VaultAdmin(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.VaultAdmin,
            chainId,
        );
    }
    static VaultExtension(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.VaultExtension,
            chainId,
        );
    }
    static WeightedPoolFactory(chainId: ChainId): Hex {
        return AddressProvider.getAddress(
            balancerV3Contracts.WeightedPoolFactory,
            chainId,
        );
    }
}
