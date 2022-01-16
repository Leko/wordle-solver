import { WORD_LENGTH } from "./constants.js";
import { Responses } from "./repl.js";

export type CharCriteria = {
  exact: string | null;
  not: Set<string>;
};
export type WordCriteria = {
  contains: Set<string>;
  not: Set<string>;
  chars: CharCriteria[];
};

export function buildCriteria(responses: Responses): WordCriteria {
  let contains = new Set<string>();
  let not = new Set<string>();
  let chars = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    chars[i] = {
      exact: null as string | null,
      not: new Set<string>(),
    };
    for (const p of responses) {
      if (p[i].type === "exact" && !chars[i].exact) {
        chars[i].exact = p[i].char;
        chars[i].not = new Set();
      } else if (p[i].type === "wrong") {
        not.add(p[i].char);
      } else if (p[i].type === "wrongSpot") {
        chars[i].not.add(p[i].char);
        contains.add(p[i].char);
      }
    }
  }
  for (const c of chars) {
    not.delete(c.exact!);
  }
  for (const c of contains) {
    not.delete(c);
  }
  return { contains, not, chars };
}

export function createFilter(responses: Responses): (word: string) => boolean {
  if (responses.length === 0) {
    return () => true;
  }

  const { contains, not, chars } = buildCriteria(responses);
  const exactRegEx = new RegExp(
    "^" + chars.reduce((str, c) => str + (c.exact ?? `.`), "") + "$"
  );
  return function createdFilter(word: string): boolean {
    if (!exactRegEx.test(word)) {
      return false;
    }
    for (const c of contains) {
      if (!word.includes(c)) {
        return false;
      }
    }
    for (let i = 0; i < chars.length; i++) {
      const c = word[i];
      if (not.has(c) || chars[i].not.has(c)) {
        return false;
      }
    }
    return true;
  };
}
