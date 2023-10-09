import { MockChain } from "@fleet-sdk/mock-chain";
import { describe, it } from "bun:test";
import { SpendSettingsTransaction } from "../src/transaction-objects";
import { gridzDefaults } from "../src/common";

describe("Spend settings box", () => {
  it("should not be spendable", () => {
    const chain = new MockChain({ height: 1_052_944 });
    const spender = chain.newParty("bob");
    const tx = new SpendSettingsTransaction(gridzDefaults, gridzDefaults);

    // construct the transaction
    // ensure chain.execute is false
  });
});
