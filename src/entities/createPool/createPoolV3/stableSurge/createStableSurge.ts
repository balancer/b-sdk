import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
    CreatePoolStableSurgeInput,
} from '../../types';
import { stableSurgeFactoryAbi } from '@/abi/stableSurgeFactory';
import { STABLE_SURGE_FACTORY, sortByAddress } from '@/utils';
import { Hex } from '@/types';

export class CreatePoolStableSurge implements CreatePoolBase {
    buildCall(input: CreatePoolStableSurgeInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: STABLE_SURGE_FACTORY[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolStableSurgeInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress, // balancer core pool types are not allowed to have a creator
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            sortedTokenConfigs,
            input.amplificationParameter,
            roleAccounts,
            input.swapFeePercentage,
            input.enableDonation,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: stableSurgeFactoryAbi,
            functionName: 'create',
            args,
        });
    }
}
