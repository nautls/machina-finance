import { SByteType, SCollType, SConstant } from "@fleet-sdk/serializer";

export function randomBytes(len: number): Uint8Array {
  const array = new Uint8Array(len);

  crypto.getRandomValues(array);

  return array;
}

export const randomModifierId = () => randomBytes(32);

export const ERG_ASSET_ID = new Uint8Array([0]);
export const ERG_ASSET_ID_SCONSTANT = new SConstant(new SCollType(new SByteType()), ERG_ASSET_ID);

export const gridzDefaults = {
  pitId: randomModifierId(),
  oatId: randomModifierId(),
  baseAssetId: ERG_ASSET_ID,
  quoteAssetId: ERG_ASSET_ID,
  makerFeePercent: 2,
  takerFeePercent: 2,
  executorFeePercent: 2,
  minerFeePercent: 2,
};
