import { Address } from 'viem';
import { BaseToken } from '@/entities/baseToken';
import { ChainId, NATIVE_ASSETS } from '@/utils';

export const BAL = '0xba100000625a3754423978a60c9317c58a424e3d';
export const auraBAL = '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d';
export const supportedTokens = [BAL, NATIVE_ASSETS[ChainId.MAINNET].wrapped];
export const auraBalToken = new BaseToken(ChainId.MAINNET, auraBAL, 18);
export const balWethId =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';
export const balWethAddress =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56' as Address;
export const auraBalStableId =
    '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249';
export const balWethAssets = [
    BAL,
    NATIVE_ASSETS[ChainId.MAINNET].wrapped,
] as Address[];
