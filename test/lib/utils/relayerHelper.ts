import { Client, TestActions, WalletActions } from 'viem';
import { authorizerAbi_V2, vaultAbi_V2 } from '../../../src/abi';
import { Address } from '../../../src/types';
import { BALANCER_RELAYER, VAULT_V2 } from '../../../src/utils';

export const grantRoles = async (
    client: Client & TestActions & WalletActions,
) => {
    const balancerDaoAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f';
    const authorizerAddress = '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6';

    // Check for available roles on balancer-deployments repo:
    // https://github.com/balancer/balancer-deployments/blob/master/action-ids/mainnet/action-ids.json
    const exitRole =
        '0xc149e88b59429ded7f601ab52ecd62331cac006ae07c16543439ed138dcb8d34';
    const joinRole =
        '0x78ad1b68d148c070372f8643c4648efbb63c6a8a338f3c24714868e791367653';
    const swapRole =
        '0x7b8a1d293670124924a0f532213753b89db10bde737249d4540e9a03657d1aff';
    const batchSwapRole =
        '0x1282ab709b2b70070f829c46bc36f76b32ad4989fecb2fcb09a1b3ce00bbfc30';
    const setRelayerApprovalRole =
        '0x0014a06d322ff07fcc02b12f93eb77bb76e28cdee4fc0670b9dec98d24bbfec8';

    await client.impersonateAccount({
        address: balancerDaoAddress,
    });
    const roles: Address[] = [
        exitRole,
        joinRole,
        swapRole,
        batchSwapRole,
        setRelayerApprovalRole,
    ];
    const chainId = await client.getChainId();
    for (const role of roles) {
        await client.writeContract({
            account: balancerDaoAddress,
            address: authorizerAddress,
            chain: client.chain,
            abi: authorizerAbi_V2,
            functionName: 'grantRole',
            args: [role, BALANCER_RELAYER[chainId]],
        });
    }
    await client.stopImpersonatingAccount({
        address: balancerDaoAddress,
    });
};

export const approveRelayer = async (
    client: Client & WalletActions,
    account: Address,
) => {
    const chainId = await client.getChainId();
    await client.writeContract({
        account,
        address: VAULT_V2[chainId],
        chain: client.chain,
        abi: vaultAbi_V2,
        functionName: 'setRelayerApproval',
        args: [account, BALANCER_RELAYER[chainId], true],
    });
};
