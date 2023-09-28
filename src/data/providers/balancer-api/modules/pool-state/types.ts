import { Address } from "viem";

export type PoolState = {
  id: Address;
  address: Address;
  type: string;
  version: string;
  tokens: {
    address: Address;
    decimals: number;
    index: number;
  }[];
};

