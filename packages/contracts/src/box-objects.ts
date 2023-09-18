import { ErgoTree, OutputBuilder } from "@fleet-sdk/core";
import { SByteType, SCollType, SConstant, SIntType, STupleType } from "@fleet-sdk/serializer";
import { TokenId } from "@fleet-sdk/common";
import { compile } from "@fleet-sdk/compiler";
import { UNSPENDABLE_CONTRACT_ERGO_TREE, gridzDefaults } from "./common";
import settingsContract from "./contracts/Settings.es";
import { hex } from "@fleet-sdk/crypto";

type RequiredFields = {
  value: bigint;
  // TODO: probably shouldnt be required if we need a input box?
  creationHeight: number;
  ergoTree: ErgoTree;
};

// similiar concept to "PageObject": https://martinfowler.com/bliki/PageObject.html
// goal is to abstract away how the boxs properties (registers, tokens, etc) are assembled
// from client code so the underlying box layout is flexible to change
export abstract class BoxObject<F> {
  #fieldsApplied = false;
  public fields: F;
  public requiredFields: RequiredFields;
  public builder: OutputBuilder;

  constructor(fields: F, requiredFieldsOverride?: Partial<RequiredFields>) {
    const ergoTreeDefault = this.contract ? compile(this.contract) : UNSPENDABLE_CONTRACT_ERGO_TREE;

    this.requiredFields = {
      value: 10000000n,
      creationHeight: 100,
      ergoTree: ergoTreeDefault,
      ...requiredFieldsOverride,
    };

    const { value, ergoTree, creationHeight } = this.requiredFields;

    this.builder = new OutputBuilder(value, ergoTree, creationHeight);
    this.fields = fields;
  }

  protected addNfts(...tokenIds: TokenId[]) {
    const tokens = tokenIds.map((tokenId) => ({ tokenId, amount: 1n }));

    this.builder.addTokens(tokens);

    return this;
  }

  // if the ergotree was compiled from a contract string return the plaintext contract
  // can be overriden by external code by providing an `ergoTree` in the constructors `requiredFields` parameter
  get contract(): string | undefined {
    return;
  }

  updateErgoTree(newTree: ErgoTree): BoxObject<F> {
    this.requiredFields.ergoTree = newTree;

    const { value, ergoTree, creationHeight } = this.requiredFields;

    this.builder = new OutputBuilder(value, ergoTree, creationHeight);

    if (this.#fieldsApplied) {
      this.applyFields();
    }

    return this;
  }

  asOutput() {
    return this.applyFields().builder.build();
  }

  asInput() {
    throw new Error("no impl yet");
  }

  asDataInput() {
    return this.asInput;
  }

  applyToBuilder(): BoxObject<F> {
    this.#fieldsApplied = true;

    return this.applyFields();
  }

  // Apply this box objects specification to the box builder
  protected abstract applyFields(): BoxObject<F>;
}

export type SettingsFields = typeof gridzDefaults;

export class SettingsBoxObject extends BoxObject<SettingsFields> {
  get contract(): string {
    return settingsContract;
  }

  protected override applyFields() {
    const {
      pitId,
      oatId,
      baseAssetId,
      quoteAssetId,
      makerFeePercent,
      takerFeePercent,
      executorFeePercent,
      minerFeePercent,
    } = this.fields;

    const nftsIds = [pitId, oatId].map(hex.encode);
    this.addNfts(...nftsIds);

    const intIntTupleType = new STupleType([new SIntType(), new SIntType()]);
    const collByteType = new SCollType(new SByteType());

    this.builder.setAdditionalRegisters({
      R4: new SConstant(collByteType, baseAssetId).toHex(),
      R5: new SConstant(collByteType, quoteAssetId).toHex(),
      R6: new SConstant(intIntTupleType, [makerFeePercent, takerFeePercent]).toHex(),
      R7: new SConstant(intIntTupleType, [executorFeePercent, minerFeePercent]).toHex(),
    });

    return this;
  }
}
