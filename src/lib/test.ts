import { pinyinSymbolToNumber, pinyinNumberToSymbol, suggestPinyin } from "./pinyinConverter";

console.log("suggestPinyin('脚镣'):", suggestPinyin("脚镣"));
console.log("pinyinSymbolToNumber('jiǎo liào'):", pinyinSymbolToNumber("jiǎo liào"));
console.log("pinyinSymbolToNumber('jia3o lia4o'):", pinyinSymbolToNumber("jia3o lia4o"));
console.log("pinyinSymbolToNumber('jia53o5 lia54o5'):", pinyinSymbolToNumber("jia53o5 lia54o5"));
console.log("pinyinSymbolToNumber('jiao53 liao54'):", pinyinSymbolToNumber("jiao53 liao54"));
