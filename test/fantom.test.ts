// pnpm test -- test/fantom.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { SmartOrderRouter } from "../src/sor";
import { sorGetSwapsWithPools } from "../src/static";
import { ChainId, NATIVE_ASSETS, BATCHSIZE, VAULT } from "../src/utils";
import { Token, TokenAmount } from "../src/entities";
import { OnChainPoolDataEnricher } from "../src/data/enrichers/onChainPoolDataEnricher";
import { SwapKind, SwapOptions } from "../src/types";
import { BasePool } from "../src/entities/pools";
import { MockPoolProvider } from "./lib/utils/mockPoolProvider";

import testPools from "./lib/testData/fantom_65313450.json";
import { RawBasePool } from "../src";

describe(
  "Fantom SOR",
  () => {
    const chainId = ChainId.FANTOM;
    const inputToken = NATIVE_ASSETS[chainId];
    const rpcUrl = "http://127.0.0.1:8138/";
    const mockPoolProvider = new MockPoolProvider(
      testPools.pools as RawBasePool[]
    );
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
      chainId,
      rpcUrl,
      BATCHSIZE[chainId],
      VAULT[chainId]
    );

    const sor = new SmartOrderRouter({
      chainId,
      poolDataProviders: mockPoolProvider,
      poolDataEnrichers: onChainPoolDataEnricher,
      rpcUrl: rpcUrl,
    });

    const BEETS = new Token(
      chainId,
      "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e",
      18,
      "BEETS"
    );

    const swapOptions: SwapOptions = {
      block: 65313450n,
    };

    let pools: BasePool[];
    // Since constructing a Swap mutates the pool balances, we refetch for each test
    // May be a better way to deep clone a BasePool[] class instead
    beforeEach(async () => {
      pools = await sor.fetchAndCachePools(swapOptions.block);
    });

    describe("Native Swaps", () => {
      test("Native -> Token givenIn", async () => {
        const inputAmount = TokenAmount.fromHumanAmount(inputToken, "100");

        const swap = await sorGetSwapsWithPools(
          inputToken,
          BEETS,
          SwapKind.GivenIn,
          inputAmount,
          pools,
          swapOptions
        );

        if (!swap) throw new Error("Swap is undefined");

        const onchain = await swap.query(rpcUrl, swapOptions.block);

        expect(swap.quote.amount).toEqual(onchain.amount);
        expect(swap.inputAmount.amount).toEqual(inputAmount.amount);
        expect(swap.outputAmount.amount).toEqual(swap.quote.amount);
      });

      test("Native ETH -> Token givenOut", async () => {
        const outputAmount = TokenAmount.fromHumanAmount(BEETS, "100000");

        const swap = await sorGetSwapsWithPools(
          inputToken,
          BEETS,
          SwapKind.GivenOut,
          outputAmount,
          pools,
          swapOptions
        );

        if (!swap) throw new Error("Swap is undefined");

        const onchain = await swap.query(rpcUrl, swapOptions.block);

        expect(swap.quote.amount).toEqual(onchain.amount);
        expect(swap.inputAmount.amount).toEqual(swap.quote.amount);
        expect(swap.outputAmount.amount).toEqual(outputAmount.amount);
      });
    });
  }
);
