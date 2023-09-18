import { SConstant, SCollType, SByteType } from "@fleet-sdk/serializer";
import { hex } from "@fleet-sdk/crypto";

const constType = new SCollType(new SByteType());

console.log(new SConstant(constType, new Uint8Array([0])));

const array = new Uint8Array(10);
crypto.getRandomValues(array);

console.log("Your lucky numbers:");
for (const num of array) {
  console.log(num);
}

const ids = [array].map(hex.encode);
console.log(ids);

