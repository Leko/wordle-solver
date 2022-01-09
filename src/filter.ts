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
  let contains = "";
  let not = "";
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
        not += p[i].char;
      } else if (p[i].type === "wrongSpot") {
        chars[i].not.add(p[i].char);
        contains += p[i].char;
      }
    }
  }
  for (const c of chars) {
    not = not.replace(c.exact!, "");
  }
  for (const c of contains) {
    not = not.replace(c, "");
  }
  return {
    contains: new Set(contains),
    not: new Set(not),
    chars,
  };
}

export function createFilter(responses: Responses): (word: string) => boolean {
  if (responses.length === 0) {
    return () => true;
  }

  const { contains, not, chars } = buildCriteria(responses);
  return function createdFilter(word: string): boolean {
    for (const c of word) {
      if (not.has(c)) {
        return false;
      }
    }
    for (const c of contains) {
      if (word.indexOf(c) === -1) {
        return false;
      }
    }
    return chars.every(({ exact, not }, i) => {
      if (typeof exact === "string" && exact !== word[i]) {
        return false;
      }
      if (not.has(word[i])) {
        return false;
      }
      return true;
    });
  };
}
