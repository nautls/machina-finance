import { ErgoTree, OutputBuilder } from "@fleet-sdk/core";
import { SByteType, SCollType, SConstant, SIntType, STupleType } from "@fleet-sdk/serializer";
import { TokenId } from "@fleet-sdk/common";
import { compile } from "@fleet-sdk/compiler";
import { gridzDefaults } from "./common";
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
  public fields: F;
  protected builder: OutputBuilder;

  constructor(fields: F, requiredFields?: Partial<RequiredFields>) {
    // allow the BoxObject fields to be overriden by parameters, this allows us to inject
    // bad data in tests
    const { value, ergoTree, creationHeight } = {
      ...this.requiredFieldsDefaults,
      ...requiredFields,
    };

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
  get contract(): string {
    return "sigmaProp(false) // BOX OBJECT DEFAULT PLACEHOLDER";
  }

  asOutput() {
    return this.applyToBuilder().build();
  }

  asInput() {
    throw new Error("no impl yet");
  }

  asDataInput() {
    return this.asInput;
  }

  private get requiredFieldsDefaults(): RequiredFields {
    return {
      value: 100000000n,
      creationHeight: 100,
      ergoTree: compile(this.contract),
    };
  }

  // Apply this box objects specification to the box builder
  // return the builder as an escape hatch so further overides and extra config can be applied
  // in the case of escape hatch the client code would do: MyBoxObject.applyToBuilder().setValue(1000n).build();
  // instead of just MyBoxObject.asOutput();
  abstract applyToBuilder(): OutputBuilder;
}

type SettingsFields = typeof gridzDefaults;

export class SettingsBoxObject extends BoxObject<SettingsFields> {
  get contract(): string {
    return settingsContract;
  }

  override applyToBuilder() {
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

    return this.builder.setAdditionalRegisters({
      R4: new SConstant(collByteType, baseAssetId).toHex(),
      R5: new SConstant(collByteType, quoteAssetId).toHex(),
      R6: new SConstant(intIntTupleType, [makerFeePercent, takerFeePercent]).toHex(),
      R7: new SConstant(intIntTupleType, [executorFeePercent, minerFeePercent]).toHex(),
    });
  }
}
