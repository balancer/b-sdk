import {
    Client,
    concat,
    pad,
    parseSignature,
    PublicActions,
    toHex,
    WalletActions,
} from 'viem';
import { MAX_UINT256, VAULT } from '../../utils';
import { Address, Hex } from '../../types';
import { vaultV2Abi } from '../../abi';

enum RelayerAction {
    JoinPool = 'JoinPool',
    ExitPool = 'ExitPool',
    Swap = 'Swap',
    BatchSwap = 'BatchSwap',
    SetRelayerApproval = 'SetRelayerApproval',
}

export class RelayerAuthorization {
    /**
     * Cannot be constructed.
     */
    private constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }

    static encodeCalldataAuthorization = (
        calldata: Hex,
        deadline: bigint,
        signatureHex: Hex,
    ): Hex => {
        const encodedDeadline = pad(toHex(deadline), { size: 32 });
        const { v, r, s } = parseSignature(signatureHex);
        const encodedV = pad(toHex(v as bigint), { size: 32 });
        const encodedR = pad(r, { size: 32 });
        const encodedS = pad(s, { size: 32 });
        return concat([
            calldata,
            encodedDeadline,
            encodedV,
            encodedR,
            encodedS,
        ]);
    };

    static signJoinAuthorization = (
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline?: bigint,
        nonce?: bigint,
    ): Promise<Hex> =>
        RelayerAuthorization.signAuthorizationFor(
            RelayerAction.JoinPool,
            client,
            signerAddress,
            allowedSender,
            allowedCalldata,
            deadline,
            nonce,
        );

    static signExitAuthorization = (
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline?: bigint,
        nonce?: bigint,
    ): Promise<Hex> =>
        RelayerAuthorization.signAuthorizationFor(
            RelayerAction.ExitPool,
            client,
            signerAddress,
            allowedSender,
            allowedCalldata,
            deadline,
            nonce,
        );

    static signSwapAuthorization = (
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline?: bigint,
        nonce?: bigint,
    ): Promise<Hex> =>
        RelayerAuthorization.signAuthorizationFor(
            RelayerAction.Swap,
            client,
            signerAddress,
            allowedSender,
            allowedCalldata,
            deadline,
            nonce,
        );

    static signBatchSwapAuthorization = (
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline?: bigint,
        nonce?: bigint,
    ): Promise<Hex> =>
        RelayerAuthorization.signAuthorizationFor(
            RelayerAction.BatchSwap,
            client,
            signerAddress,
            allowedSender,
            allowedCalldata,
            deadline,
            nonce,
        );

    static signSetRelayerApprovalAuthorization = (
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline?: bigint,
        nonce?: bigint,
    ): Promise<Hex> =>
        RelayerAuthorization.signAuthorizationFor(
            RelayerAction.SetRelayerApproval,
            client,
            signerAddress,
            allowedSender,
            allowedCalldata,
            deadline,
            nonce,
        );

    static signAuthorizationFor = async (
        type: RelayerAction,
        client: Client & WalletActions & PublicActions,
        signerAddress: Address,
        allowedSender: Address,
        allowedCalldata: Hex,
        deadline: bigint = MAX_UINT256,
        nonce?: bigint,
    ): Promise<Hex> => {
        const chainId = await client.getChainId();
        const verifyingContract = VAULT[chainId];

        const domain = {
            name: 'Balancer V2 Vault',
            version: '1',
            chainId,
            verifyingContract,
        };

        const types = {
            [type]: [
                { name: 'calldata', type: 'bytes' },
                { name: 'sender', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        };

        let _nonce = nonce;
        if (_nonce === undefined) {
            _nonce = await client.readContract({
                abi: vaultV2Abi,
                address: verifyingContract,
                functionName: 'getNextNonce',
                args: [signerAddress],
            });
        }

        const signature = client.signTypedData({
            account: signerAddress,
            domain,
            types,
            primaryType: type,
            message: {
                calldata: allowedCalldata,
                sender: allowedSender,
                nonce: _nonce,
                deadline,
            },
        });

        return signature;
    };
}
