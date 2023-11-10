import { BoxObject, SettingsBoxObject, SettingsFields } from "./box-objects";
import { ErgoUnsignedTransaction, TransactionBuilder } from "@fleet-sdk/core";

interface RequiredFields {
  creationHeight: number;
}

interface TransactionIoSetup<F> {
  fields: F;
  boxes: BoxObject<unknown>[];
}

export abstract class TransactionObject<InF, OutF = InF> {
  public in: TransactionIoSetup<InF>;
  public out: TransactionIoSetup<OutF>;
  public builder: TransactionBuilder;

  constructor(
    inSetup: TransactionIoSetup<InF>,
    outSetup: TransactionIoSetup<OutF>,
    requiredFields: RequiredFields,
  ) {
    this.in = inSetup;
    this.out = outSetup;
    this.builder = new TransactionBuilder(requiredFields.creationHeight);
  }

  applyToBuilder(): TransactionObject<InF, OutF> {
    this.builder.to(this.out.boxes.map((b) => b.applyToBuilder().builder));
    this.builder.from(this.in.boxes.map((b) => b.asInput()));

    return this;
  }

  build(): ErgoUnsignedTransaction {
    return this.applyToBuilder().builder.build();
  }
}

export class SpendSettingsTransaction extends TransactionObject<SettingsFields> {
  constructor(inFields: SettingsFields, outFields: SettingsFields, requiredFields: RequiredFields) {
    // box fields are same as transaction fields in single box transactions like this.
    // in transactions containing more inputs/outputs the high level transaction fields will likely differ
    // as a whole and the individual box object fields will be created from the transaction object fields
    const inSetup = {
      fields: inFields,
      boxes: [new SettingsBoxObject(inFields)],
    };

    const outSetup = {
      fields: outFields,
      boxes: [new SettingsBoxObject(outFields)],
    };

    super(inSetup, outSetup, requiredFields);
  }
}
