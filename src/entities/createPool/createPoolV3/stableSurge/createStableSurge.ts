import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
    CreatePoolStableSurgeInput,
} from '../../types';
import { stableSurgeFactoryAbiExtended } from '@/abi';
import { balancerV3Contracts, sortByAddress } from '@/utils';
import { Hex } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolStableSurge implements CreatePoolBase {
    buildCall(input: CreatePoolStableSurgeInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.StableSurgePoolFactory(input.chainId),
        };
    }

    private encodeCall(input: CreatePoolStableSurgeInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const tokens = sortedTokenConfigs.map(({ address, ...rest }) => ({
            token: address,
            ...rest,
        }));

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress, // balancer core pool types are not allowed to have a creator
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            tokens,
            input.amplificationParameter,
            roleAccounts,
            input.swapFeePercentage,
            input.enableDonation,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: stableSurgeFactoryAbiExtended,
            functionName: 'create',
            args,
        });
    }
}
