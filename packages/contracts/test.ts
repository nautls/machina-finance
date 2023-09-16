import { SettingsBoxObject, gridzDefaults } from "./src/box-object";

const settings = new SettingsBoxObject(gridzDefaults);
const box = settings.asOutput();

console.log(BigInt(5));
//console.log(settings, box);
