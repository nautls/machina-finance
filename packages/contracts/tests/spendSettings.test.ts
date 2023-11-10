import { MockChain } from "@fleet-sdk/mock-chain";
import { describe, it, expect } from "bun:test";
import { SpendSettingsTransaction } from "../src/transaction-objects";
import { gridzDefaults } from "../src/common";

describe("Spend settings box", () => {
  it("should not be spendable", () => {
    const chain = new MockChain({ height: 1_052_944 });
    const tx = new SpendSettingsTransaction(gridzDefaults, gridzDefaults, {
      creationHeight: 1_052_944,
    });

    expect(chain.execute(tx.build(), { throw: false })).toBe(false);
  });
});
