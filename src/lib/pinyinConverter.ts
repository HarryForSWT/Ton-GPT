import { pinyin } from "pinyin-pro";

const symbolToToneMap: Record<string, { char: string; tone: number }> = {
  // Ton 1
  'ā': { char: 'a', tone: 1 }, 'ē': { char: 'e', tone: 1 }, 'ī': { char: 'i', tone: 1 },
  'ō': { char: 'o', tone: 1 }, 'ū': { char: 'u', tone: 1 }, 'ǖ': { char: 'ü', tone: 1 },
  'Ā': { char: 'A', tone: 1 }, 'E': { char: 'E', tone: 1 }, 'Ī': { char: 'I', tone: 1 },
  'Ō': { char: 'O', tone: 1 }, 'Ū': { char: 'U', tone: 1 }, 'Ǖ': { char: 'Ü', tone: 1 },

  // Ton 2
  'á': { char: 'a', tone: 2 }, 'é': { char: 'e', tone: 2 }, 'í': { char: 'i', tone: 2 },
  'ó': { char: 'o', tone: 2 }, 'ú': { char: 'u', tone: 2 }, 'ǘ': { char: 'ü', tone: 2 },
  'Á': { char: 'A', tone: 2 }, 'É': { char: 'E', tone: 2 }, 'Í': { char: 'I', tone: 2 },
  'Ó': { char: 'O', tone: 2 }, 'Ú': { char: 'U', tone: 2 }, 'Ǘ': { char: 'Ü', tone: 2 },

  // Ton 3
  'ǎ': { char: 'a', tone: 3 }, 'ě': { char: 'e', tone: 3 }, 'ǐ': { char: 'i', tone: 3 },
  'ǒ': { char: 'o', tone: 3 }, 'ǔ': { char: 'u', tone: 3 }, 'ǚ': { char: 'ü', tone: 3 },
  'Ǎ': { char: 'A', tone: 3 }, 'Ě': { char: 'E', tone: 3 }, 'Ǐ': { char: 'I', tone: 3 },
  'Ǒ': { char: 'O', tone: 3 }, 'Ǔ': { char: 'U', tone: 3 }, 'Ǚ': { char: 'Ü', tone: 3 },

  // Ton 4
  'à': { char: 'a', tone: 4 }, 'è': { char: 'e', tone: 4 }, 'ì': { char: 'i', tone: 4 },
  'ò': { char: 'o', tone: 4 }, 'ù': { char: 'u', tone: 4 }, 'ǜ': { char: 'ü', tone: 4 },
  'À': { char: 'A', tone: 4 }, 'È': { char: 'E', tone: 4 }, 'Ì': { char: 'I', tone: 4 },
  'Ò': { char: 'O', tone: 4 }, 'Ù': { char: 'U', tone: 4 }, 'Ǜ': { char: 'Ü', tone: 4 },
};

function getToneChar(vowel: string, tone: number): string {
  const tones: Record<string, string[]> = {
    a: ['a', 'ā', 'á', 'ǎ', 'à', 'a'],
    o: ['o', 'ō', 'ó', 'ǒ', 'ò', 'o'],
    e: ['e', 'ē', 'é', 'ě', 'è', 'e'],
    i: ['i', 'ī', 'í', 'ǐ', 'ì', 'i'],
    u: ['u', 'ū', 'ú', 'ǔ', 'ù', 'u'],
    v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    A: ['A', 'Ā', 'Á', 'Ǎ', 'À', 'A'],
    O: ['O', 'Ō', 'Ó', 'Ǒ', 'Ò', 'O'],
    E: ['E', 'E', 'É', 'Ě', 'È', 'E'],
    I: ['I', 'Ī', 'Í', 'Ǐ', 'Ì', 'I'],
    U: ['U', 'Ū', 'Ú', 'Ǔ', 'Ù', 'U'],
    V: ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü'],
    Ü: ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü']
  };
  const charTones = tones[vowel];
  if (!charTones) return vowel;
  return charTones[tone] || vowel;
}

function addToneToSyllable(syllable: string, tone: number): string {
  const s = syllable.replace(/v/g, 'ü').replace(/V/g, 'Ü');
  
  if (tone < 1 || tone > 4) {
    return s;
  }

  const lower = s.toLowerCase();
  let idx = -1;

  if (lower.indexOf('a') !== -1) {
    idx = lower.indexOf('a');
  } else if (lower.indexOf('o') !== -1) {
    idx = lower.indexOf('o');
  } else if (lower.indexOf('e') !== -1) {
    idx = lower.indexOf('e');
  } else if (lower.indexOf('ui') !== -1) {
    idx = lower.indexOf('ui') + 1;
  } else if (lower.indexOf('iu') !== -1) {
    idx = lower.indexOf('iu') + 1;
  } else {
    const match = s.match(/[iouüIOUÜ]/);
    if (match && match.index !== undefined) {
      idx = match.index;
    }
  }

  if (idx !== -1) {
    const char = s[idx];
    const tonedChar = getToneChar(char, tone);
    return s.substring(0, idx) + tonedChar + s.substring(idx + 1);
  }

  return s;
}

/**
 * Konvertiert Pinyin mit Ton-Nummern (z.B. "ni3hao3") in Pinyin mit Akzenten (z.B. "nǐhǎo").
 */
export function pinyinNumberToSymbol(pinyinNum: string): string {
  return pinyinNum.replace(/([a-zA-ZüÜvV]+)([1-5])/g, (match, syllable, toneStr) => {
    const tone = parseInt(toneStr, 10);
    return addToneToSyllable(syllable, tone);
  });
}

/**
 * Konvertiert Pinyin mit Akzenten (z.B. "nǐhǎo") in Pinyin mit Ton-Nummern (z.B. "ni3hao3").
 */
export function pinyinSymbolToNumber(pinyinSym: string): string {
  const pinyinSyllableRegex = /(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])?([yw])?([āáǎàaēéěèeoōóǒòoiīíǐìiuūúǔùuüǖǘǚǜv]+)(ng|n|r)?/gi;

  return pinyinSym.replace(pinyinSyllableRegex, (match, initial = '', semivowel = '', vowels = '', ending = '') => {
    let tone = 5;
    let cleanVowels = '';

    for (let i = 0; i < vowels.length; i++) {
      const char = vowels[i];
      const mapping = symbolToToneMap[char];
      if (mapping) {
        cleanVowels += mapping.char;
        tone = mapping.tone;
      } else {
        cleanVowels += char;
      }
    }

    const cleanVowelsNormalized = cleanVowels.replace(/ü/g, 'v').replace(/Ü/g, 'V');
    return `${initial}${semivowel}${cleanVowelsNormalized}${ending}${tone}`;
  });
}

/**
 * Generiert Pinyin-Vorschläge basierend auf Hanzi.
 */
export function suggestPinyin(hanzi: string): { pinyinSymbol: string; pinyinNumber: string } {
  if (!hanzi.trim()) {
    return { pinyinSymbol: "", pinyinNumber: "" };
  }

  try {
    // Generiert Pinyin mit Symbolen (Standard)
    const pinyinSymbol = pinyin(hanzi, { toneType: "symbol" });
    // Generiert Pinyin mit Nummern
    const pinyinNumber = pinyin(hanzi, { toneType: "num" });

    return {
      pinyinSymbol: pinyinSymbol.trim(),
      pinyinNumber: pinyinNumber.trim(),
    };
  } catch (error) {
    console.error("Fehler bei Pinyin-Generierung:", error);
    return { pinyinSymbol: "", pinyinNumber: "" };
  }
}
