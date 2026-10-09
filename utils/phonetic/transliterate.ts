import { PHONETIC_DICTIONARY } from './dictionary';

/**
 * Offline, rule-based phonetic transcription of Latin-script text into Devanagari.
 * It writes how a word sounds ("read" -> "रीड"), not what it means.
 * Results are approximate; add words to PHONETIC_DICTIONARY to correct them.
 */

const HALANT = '्';
const ANUSVARA = 'ं';

type Vowel = { kind: 'V'; matra: string; independent: string };
type Unit = { kind: 'C'; text: string } | Vowel | { kind: 'N' };

const v = (matra: string, independent: string): Vowel => ({ kind: 'V', matra, independent });
const c = (text: string): Unit => ({ kind: 'C', text });

const SCHWA = v('', 'अ');
const AA = v('ा', 'आ');
const I = v('ि', 'इ');
const II = v('ी', 'ई');
const U = v('ु', 'उ');
const UU = v('ू', 'ऊ');
const E = v('े', 'ए');
const AI = v('ै', 'ऐ');
const O = v('ो', 'ओ');
const AU = v('ौ', 'औ');
const AW = v('ॉ', 'ऑ');
const AAI = v('ाइ', 'आइ');
const AAII = v('ाई', 'आई');
const AAU = v('ाउ', 'आउ');
const OY = v('ॉय', 'ऑय');

const isVowelChar = (ch: string | undefined) => !!ch && 'aeiou'.includes(ch);
const isConsonantChar = (ch: string | undefined) => !!ch && /[a-z]/.test(ch) && !isVowelChar(ch);

const LETTER_NAMES: Record<string, string> = {
  a: 'ए', b: 'बी', c: 'सी', d: 'डी', e: 'ई', f: 'एफ', g: 'जी', h: 'एच', i: 'आई',
  j: 'जे', k: 'के', l: 'एल', m: 'एम', n: 'एन', o: 'ओ', p: 'पी', q: 'क्यू', r: 'आर',
  s: 'एस', t: 'टी', u: 'यू', v: 'वी', w: 'डब्ल्यू', x: 'एक्स', y: 'वाई', z: 'ज़ेड',
};

const ENGLISH_CONSONANTS: [string, string][] = [
  ['tch', 'च'], ['sch', 'स्क'], ['chh', 'छ'],
  ['sh', 'श'], ['ch', 'च'], ['th', 'थ'], ['ph', 'फ'], ['wh', 'व'], ['ck', 'क'],
  ['kh', 'ख'], ['gh', 'घ'], ['bh', 'भ'], ['dh', 'ध'], ['jh', 'झ'], ['qu', 'क्व'],
  ['b', 'ब'], ['d', 'ड'], ['f', 'फ'], ['h', 'ह'], ['j', 'ज'], ['k', 'क'], ['l', 'ल'],
  ['m', 'म'], ['n', 'न'], ['p', 'प'], ['q', 'क'], ['r', 'र'], ['s', 'स'], ['t', 'ट'],
  ['v', 'व'], ['w', 'व'], ['x', 'क्स'], ['z', 'ज़'],
];

/** Hinglish words: dental t/d and plain vowel values. */
const INDIC_CONSONANTS: [string, string][] = [
  ['chh', 'छ'], ['sh', 'श'], ['ch', 'च'], ['th', 'थ'], ['ph', 'फ'], ['kh', 'ख'],
  ['gh', 'घ'], ['bh', 'भ'], ['dh', 'ध'], ['jh', 'झ'],
  ['b', 'ब'], ['c', 'क'], ['d', 'द'], ['f', 'फ'], ['g', 'ग'], ['h', 'ह'], ['j', 'ज'],
  ['k', 'क'], ['l', 'ल'], ['m', 'म'], ['n', 'न'], ['p', 'प'], ['q', 'क'], ['r', 'र'],
  ['s', 'स'], ['t', 'त'], ['v', 'व'], ['w', 'व'], ['x', 'क्स'], ['y', 'य'], ['z', 'ज़'],
];

function matchConsonant(word: string, i: number, table: [string, string][]): [string, number] | null {
  for (const [pattern, out] of table) {
    if (word.startsWith(pattern, i)) return [out, pattern.length];
  }
  return null;
}

function assemble(units: Unit[]): string {
  let out = '';
  let prev: Unit['kind'] | null = null;
  for (const unit of units) {
    if (unit.kind === 'C') {
      if (prev === 'C') out += HALANT;
      out += unit.text;
    } else if (unit.kind === 'V') {
      out += prev === 'C' ? unit.matra : unit.independent;
    } else {
      out += ANUSVARA;
    }
    prev = unit.kind === 'N' ? 'V' : unit.kind;
  }
  return out;
}

/** Nasal before another consonant becomes anusvara (paint -> पेंट). */
function pushNasalOrConsonant(units: Unit[], word: string, i: number, letter: string): boolean {
  const prev = units[units.length - 1];
  const next = word[i + 1];
  if (prev?.kind === 'V' && isConsonantChar(next) && next !== 'y' && next !== 'h') {
    units.push({ kind: 'N' });
    return true;
  }
  units.push(c(letter === 'n' ? 'न' : 'म'));
  return true;
}

function firstVowelIndex(word: string): number {
  for (let i = 0; i < word.length; i += 1) if (isVowelChar(word[i])) return i;
  return -1;
}

/** Index of a vowel lengthened by a silent "e" (time, make, driver), or -1. */
function findLongVowel(word: string): number {
  const m = /([aeiou])([b-df-hj-np-tv-z])(e|er|ed|es|ing|le)$/.exec(word);
  if (!m) return -1;
  const idx = m.index;
  const vowel = m[1];
  const consonant = m[2];
  if ('wxy'.includes(consonant)) return -1;
  if (isVowelChar(word[idx - 1])) return -1;
  if (idx !== firstVowelIndex(word)) return -1;
  if (m[3] !== 'e' && vowel === 'e') return -1;
  return idx;
}

function englishWord(word: string): string {
  const units: Unit[] = [];
  const longVowel = findLongVowel(word);
  let end = word.length;
  // Silent final "e" (time, service); "-le" keeps a schwa (table -> टेबल).
  if (word.length > 2 && word.endsWith('e') && isConsonantChar(word[end - 2])) {
    if (word[end - 2] === 'l' && isConsonantChar(word[end - 3])) {
      end -= 2;
    } else {
      end -= 1;
    }
  }
  const trailingLe = end === word.length - 2;

  let i = 0;
  while (i < end) {
    const ch = word[i];
    const rest = word.slice(i, end);
    const atStart = i === 0;

    if (rest.startsWith('tion') || rest.startsWith('sion')) {
      units.push(c('श'), SCHWA, c('न'));
      i += 4;
      continue;
    }
    if (rest.startsWith('cian')) {
      units.push(c('श'), I, c('य'), SCHWA, c('न'));
      i += 4;
      continue;
    }
    if (word.startsWith('ture', i)) {
      units.push(c('च'), SCHWA, c('र'));
      i += 4;
      continue;
    }
    if (atStart && (rest.startsWith('kn') || rest.startsWith('wr'))) {
      i += 1;
      continue;
    }
    if (ch === 'u' && word[i - 1] === 'g' && isVowelChar(word[i + 1])) {
      i += 1; // silent "u" in guard, guest
      continue;
    }

    if (isVowelChar(ch) || (ch === 'y' && !atStart && !isVowelChar(word[i + 1]))) {
      const vowelResult = englishVowel(word, i, end, longVowel);
      units.push(...vowelResult.units);
      i += vowelResult.length;
      continue;
    }

    if (ch === 'y') {
      units.push(c('य'));
      i += 1;
      continue;
    }
    if (ch === 'g' && word[i + 1] === 'h' && !atStart) {
      i += 2; // silent "gh" (daughter); "igh" is handled as a vowel
      continue;
    }
    const digraph = matchConsonant(word, i, ENGLISH_CONSONANTS);
    if (digraph && digraph[1] > 1) {
      units.push(c(digraph[0]));
      i += digraph[1];
      continue;
    }
    if (ch === 'n' && word[i + 1] === 'g' && !isVowelChar(word[i + 2])) {
      units.push({ kind: 'N' }, c('ग'));
      i += 2;
      continue;
    }
    if ((ch === 'n' || ch === 'm') && word[i + 1] !== ch) {
      pushNasalOrConsonant(units, word, i, ch);
      i += 1;
      continue;
    }
    if (ch === 'c') {
      units.push(c('eiy'.includes(word[i + 1] ?? '') ? 'स' : 'क'));
      i += word[i + 1] === 'c' ? 2 : 1;
      continue;
    }
    if (ch === 'g') {
      units.push(c('eiy'.includes(word[i + 1] ?? '') && !atStart ? 'ज' : 'ग'));
      i += word[i + 1] === 'g' ? 2 : 1;
      continue;
    }

    const match = matchConsonant(word, i, ENGLISH_CONSONANTS);
    if (match) {
      units.push(c(match[0]));
      let len = match[1];
      if (len === 1 && word[i + 1] === ch) len = 2; // doubled letters sound once
      i += len;
      continue;
    }
    i += 1;
  }

  if (trailingLe) units.push(SCHWA, c('ल'));
  return assemble(units);
}

function englishVowel(
  word: string,
  i: number,
  end: number,
  longVowel: number
): { units: Unit[]; length: number } {
  const ch = word[i];
  const next = word[i + 1];
  const after = word[i + 2];
  const rest = word.slice(i, end);
  const isLast = i === end - 1;
  const hasOtherVowel = /[aeiou]/.test(word.slice(0, i) + word.slice(i + 1));

  if (rest.startsWith('eigh')) return { units: [E], length: 4 };
  if (rest.startsWith('igh')) return { units: [i + 3 >= end ? AAII : AAI], length: 3 };
  if (rest.startsWith('ee') || rest.startsWith('ea') || rest.startsWith('ie')) return { units: [II], length: 2 };
  if (rest.startsWith('oo')) return { units: [UU], length: 2 };
  if (rest.startsWith('ou')) return { units: [AAU], length: 2 };
  if (rest.startsWith('ow')) {
    return { units: [i + 2 >= end ? O : AAU], length: 2 };
  }
  if (rest.startsWith('ai') || rest.startsWith('ay')) return { units: [E], length: 2 };
  if (rest.startsWith('ey')) return { units: [i + 2 >= end ? II : E], length: 2 };
  if (rest.startsWith('oi') || rest.startsWith('oy')) return { units: [OY], length: 2 };
  if (rest.startsWith('au') || rest.startsWith('aw')) return { units: [AW], length: 2 };
  if (rest.startsWith('ue')) return { units: [UU], length: 2 };
  if (rest.startsWith('oa')) return { units: [O], length: 2 };

  // "er", "ir", "ur" before a consonant or at the end sound like "अर"
  if ('eiu'.includes(ch) && next === 'r' && (i + 2 >= end || isConsonantChar(after)) && i > 0) {
    return { units: [SCHWA], length: 1 };
  }

  if (i === longVowel) {
    if (ch === 'a') return { units: [E], length: 1 };
    if (ch === 'i') return { units: [AAI], length: 1 };
    if (ch === 'o') return { units: [O], length: 1 };
    if (ch === 'u') return { units: [UU], length: 1 };
    if (ch === 'e') return { units: [II], length: 1 };
  }

  const openSyllable = isConsonantChar(next) && isVowelChar(after);
  // Unstressed last syllable before a final n/r/l/m sounds like "अ" (open -> ओपन, doctor -> डॉक्टर)
  const weakFinal =
    hasOtherVowel && i > 0 && i + 2 === end && 'nrlm'.includes(next ?? '') && isConsonantChar(word[i - 1]);

  switch (ch) {
    case 'a':
      if (isLast) return { units: [AA], length: 1 };
      if (next === 'r') return { units: [AA], length: 1 };
      if (rest.startsWith('tion', 1)) return { units: [E], length: 1 };
      if (next === 'l' && after === 'k') return { units: [AW], length: 2 };
      if (next === 'l' && after === 'l') return { units: [AW], length: 1 };
      if (word[i - 1] === 'w') return { units: [AW], length: 1 };
      if (weakFinal && next !== 'r') return { units: [SCHWA], length: 1 };
      if (openSyllable && i === 0) return { units: [E], length: 1 };
      if (isConsonantChar(next) && after === 'y' && i === firstVowelIndex(word)) return { units: [E], length: 1 };
      return { units: [AI], length: 1 };
    case 'e':
      if (isLast) return { units: [II], length: 1 };
      if (weakFinal) return { units: [SCHWA], length: 1 };
      return { units: [E], length: 1 };
    case 'i':
      if (isLast) return { units: [II], length: 1 };
      if (isVowelChar(next)) return { units: [I, c('य')], length: 1 };
      return { units: [I], length: 1 };
    case 'o':
      if (isLast || openSyllable) return { units: [O], length: 1 };
      if (weakFinal) return { units: [SCHWA], length: 1 };
      return { units: [AW], length: 1 };
    case 'u':
      if (isLast) return { units: [UU], length: 1 };
      if (openSyllable) return { units: [UU], length: 1 };
      if (next === 'l' && after === 'l') return { units: [U], length: 1 };
      return { units: [SCHWA], length: 1 };
    case 'y':
      if (isLast) return { units: [hasOtherVowel ? II : AAII], length: 1 };
      return { units: [I], length: 1 };
    default:
      return { units: [], length: 1 };
  }
}

function indicWord(word: string): string {
  const units: Unit[] = [];
  let i = 0;
  while (i < word.length) {
    const ch = word[i];
    const rest = word.slice(i);
    const isLast = i === word.length - 1;

    if (isVowelChar(ch)) {
      const pairs: [string, Vowel][] = [
        ['aa', AA], ['ee', II], ['ii', II], ['oo', UU], ['uu', UU],
        ['ai', i + 2 === word.length ? AAII : AI], ['au', AU],
      ];
      const pair = pairs.find(([p]) => rest.startsWith(p));
      if (pair) {
        units.push(pair[1]);
        i += 2;
        continue;
      }
      const single: Record<string, Vowel> = {
        a: isLast ? AA : SCHWA,
        e: E,
        i: isLast ? II : I,
        o: O,
        u: isLast ? UU : U,
      };
      const prev = units[units.length - 1];
      // A vowel right after another vowel is written in full (mahua -> महुआ).
      const vowel = prev?.kind === 'V' && ch === 'a' ? AA : single[ch];
      units.push(vowel);
      i += 1;
      continue;
    }
    if ((ch === 'n' || ch === 'm') && word[i + 1] !== ch) {
      pushNasalOrConsonant(units, word, i, ch);
      i += 1;
      continue;
    }
    if (ch === 'g' && !isVowelChar(word[i + 1]) && word[i + 1] !== 'h' && word[i + 1] !== 'r' && word[i + 1] !== 'l' && word[i + 1] !== 'y') {
      units.push(c('ग'));
      i += 1;
      continue;
    }
    const match = matchConsonant(word, i, INDIC_CONSONANTS);
    if (match) {
      units.push(c(match[0]));
      i += match[1];
      continue;
    }
    i += 1;
  }
  return assemble(units);
}

/** Hinglish spelling cues: long "aa", aspirated consonants, Indian place endings, or a final a/i/u. */
function looksIndic(word: string): boolean {
  if (/(aa|ii|uu|bh|dh|kh|jh|chh)/.test(word) || /^gh/.test(word)) return true;
  if (/.(pur|pura|abad|nagar|garh|gaon|ganj|gram|bagh|wadi|halli|palli|pally|ghat|patti|tola|toli)$/.test(word)) return true;
  return word.length > 2 && /[aiu]$/.test(word);
}

function transliterateWord(original: string, allCapsText: boolean): string {
  const word = original.toLowerCase();
  const known = PHONETIC_DICTIONARY[word];
  if (known) return known;

  const isAcronym =
    !allCapsText && original.length >= 2 && original.length <= 4 && original === original.toUpperCase();
  // Letter groups without vowels (pm, km, bhk) are read letter by letter
  if (isAcronym || (word.length <= 4 && !/[aeiouy]/.test(word))) {
    return Array.from(word, (ch) => LETTER_NAMES[ch] ?? '').join('');
  }

  for (const [suffix, tail] of [['s', '्स'], ['es', 'ेज़']] as const) {
    const stem = word.slice(0, -suffix.length);
    if (word.endsWith(suffix) && PHONETIC_DICTIONARY[stem]) {
      return PHONETIC_DICTIONARY[stem] + tail;
    }
  }
  if (word.endsWith('ing') && PHONETIC_DICTIONARY[word.slice(0, -3)]) {
    return PHONETIC_DICTIONARY[word.slice(0, -3)] + 'िंग';
  }

  return looksIndic(word) ? indicWord(word) : englishWord(word);
}

const cache = new Map<string, string>();

/** Phonetic Devanagari for any Latin words in the text; everything else is kept as is. */
export function toPhoneticDevanagari(text: string): string {
  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  const letters = text.replace(/[^A-Za-z]/g, '');
  const allCapsText = letters.length > 4 && letters === letters.toUpperCase();
  const result = text
    // "Main Road" is the English "main", not the Hinglish "main" (मैं)
    .replace(/\bmain(?=\s+(road|street|market|gate|bazaa?r|chowk|branch|office|building)\b)/gi, 'मेन')
    .replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g, (token) => transliterateWord(token.replace(/'/g, ''), allCapsText));

  if (cache.size > 500) cache.clear();
  cache.set(text, result);
  return result;
}

export function hasLatinLetters(text: string | null | undefined): boolean {
  return !!text && /[A-Za-z]/.test(text);
}
