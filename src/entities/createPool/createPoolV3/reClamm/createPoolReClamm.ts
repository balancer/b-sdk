import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
    CreatePoolReClammInput,
} from '../../types';
import { reClammPoolFactoryAbiExtended } from '@/abi';
import { balancerV3Contracts, sortByAddress } from '@/utils';
import { Hex } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolReClamm implements CreatePoolBase {
    buildCall(input: CreatePoolReClammInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.ReClammPoolFactory(input.chainId),
        };
    }

    private encodeCall(input: CreatePoolReClammInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const tokens = sortedTokenConfigs.map(({ address, ...rest }) => ({
            token: address,
            ...rest,
        }));

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress,
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            tokens,
            roleAccounts,
            input.swapFeePercentage,
            input.priceParams,
            input.priceShiftDailyRate,
            input.centerednessMargin,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: reClammPoolFactoryAbiExtended,
            functionName: 'create',
            args,
        });
    }
}
