import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolV3StableInput,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
} from '../../types';
import { stablePoolFactoryAbi_V3 } from '@/abi';
import { STABLE_POOL_FACTORY_BALANCER_V3, sortByAddress } from '@/utils';
import { Hex } from '@/types';

export class CreatePoolStableV3 implements CreatePoolBase {
    buildCall(input: CreatePoolV3StableInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: STABLE_POOL_FACTORY_BALANCER_V3[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolV3StableInput): Hex {
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
            input.poolHooksContract,
            input.enableDonation,
            input.disableUnbalancedLiquidity,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: stablePoolFactoryAbi_V3,
            functionName: 'create',
            args,
        });
    }
}
