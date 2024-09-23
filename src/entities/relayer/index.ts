import {
    concat,
    encodeFunctionData,
    hexToBigInt,
    pad,
    slice,
    toHex,
} from 'viem';
import { Address, Hex } from '../../types';
import { batchRelayerLibraryAbi } from '../../abi/batchRelayerLibrary';
import { RelayerAuthorization } from './authorization';
import { vaultV2Abi } from '../../abi';
import { MAX_UINT256, ViemClient } from '../../utils';

export class Relayer {
    static CHAINED_REFERENCE_TEMP_PREFIX = '0xba10' as Hex; // Temporary reference: it is deleted after a read.
    static CHAINED_REFERENCE_READONLY_PREFIX = '0xba11' as Hex; // Read-only reference: it is not deleted after a read.

    static toChainedReference(key: bigint, isTemporary = true): bigint {
        const prefix = isTemporary
            ? Relayer.CHAINED_REFERENCE_TEMP_PREFIX
            : Relayer.CHAINED_REFERENCE_READONLY_PREFIX;
        // The full padded prefix is 66 characters long, with 64 hex characters and the 0x prefix.
        const paddedKey = pad(toHex(key), { dir: 'left', size: 30 });
        const chainedReferenceWithPrefix = concat([prefix, paddedKey]);
        return hexToBigInt(chainedReferenceWithPrefix);
    }

    static fromChainedReference(ref: bigint): bigint {
        const chainedReferenceWithoutPrefix = slice(toHex(ref), 2); // remove prefix
        return hexToBigInt(chainedReferenceWithoutPrefix);
    }

    static encodePeekChainedReferenceValue(reference: bigint): Hex {
        return encodeFunctionData({
            abi: batchRelayerLibraryAbi,
            functionName: 'peekChainedReferenceValue',
            args: [reference],
        });
    }

    static encodeSetRelayerApproval(
        relayerAddress: Address,
        approved: boolean,
        signature: Hex,
    ): Hex {
        return encodeFunctionData({
            abi: batchRelayerLibraryAbi,
            functionName: 'setRelayerApproval',
            args: [relayerAddress, approved, signature],
        });
    }

    static signRelayerApproval = async (
        relayerAddress: Address,
        signerAddress: Address,
        client: ViemClient,
    ): Promise<Hex> => {
        const approval = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'setRelayerApproval',
            args: [signerAddress, relayerAddress, true],
        });

        const signature =
            await RelayerAuthorization.signSetRelayerApprovalAuthorization(
                client,
                signerAddress,
                relayerAddress,
                approval,
            );

        const encodedSignature =
            RelayerAuthorization.encodeCalldataAuthorization(
                '0x',
                MAX_UINT256,
                signature,
            );

        return encodedSignature;
    };

    static encodeApproveVault(tokenAddress: Address, maxAmount: bigint): Hex {
        return encodeFunctionData({
            abi: batchRelayerLibraryAbi,
            functionName: 'approveVault',
            args: [tokenAddress, maxAmount],
        });
    }
}
