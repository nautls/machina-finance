import { BoxObject, SettingsBoxObject, SettingsFields } from "./box-objects";
import { gridzDefaults } from "./common";

interface BoxEntry {
  index: number;
  object: BoxObject<unknown>;
}

interface TransactionIoSetup<F> {
  fields: F;
  boxes: Record<string, BoxEntry>;
}

export abstract class TransactionObject<InF, OutF = InF> {
  public in: TransactionIoSetup<InF>;
  public out: TransactionIoSetup<OutF>;

  constructor(inSetup: TransactionIoSetup<InF>, outSetup: TransactionIoSetup<OutF>) {
    this.in = inSetup;
    this.out = outSetup;
  }
}

export class SpendSettingsTransaction extends TransactionObject<SettingsFields> {
  constructor(inFields: SettingsFields, outFields: SettingsFields) {
    // box fields are same as transaction fields in single box transactions like this.
    // in transactions containing more inputs/outputs the high level transaction fields will likely differ
    // as a whole and the individual box object fields will be created from the transaction object fields
    const inSetup = {
      fields: inFields,
      boxes: {
        settings: {
          index: 0,
          object: new SettingsBoxObject(inFields),
        },
      },
    };

    const outSetup = {
      fields: outFields,
      boxes: {
        settings: {
          index: 0,
          object: new SettingsBoxObject(outFields),
        },
      },
    };

    super(inSetup, outSetup);
  }
}
