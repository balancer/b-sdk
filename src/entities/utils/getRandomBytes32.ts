import { Hex } from "viem";

export const getRandomBytes32 = (): Hex => {
    const getRandomBytes8 = () => Math.random().toString(16).slice(2, 10);
    const randomBytes32 = Array(8).fill(null).map(getRandomBytes8).join('');
    return `0x${randomBytes32}`;
  };