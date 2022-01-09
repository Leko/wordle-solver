import { ResponseLine, Responses, ResponseType } from "./repl.js";
import { createFilter } from "./filter.js";
import { WORD_LENGTH } from "./constants.js";
import { baseLogger } from "./logger.js";

const debug = baseLogger.extend("guess");

export type GuessResult = {
  word: string;
  confidence: number; // 0-1
};

function getPossibleResponses(
  word: string,
  history: Responses
): ResponseLine[] {
  const types =
    history.length === 0
      ? [ResponseType.Wrong, ResponseType.WrongSpot]
      : Object.values(ResponseType);
  const result: ResponseLine[] = [];
  const open: ResponseLine[] = types.map((type) => [{ type, char: word[0] }]);
  while (open.length !== 0) {
    const node = open.pop()!;
    if (node.length === WORD_LENGTH) {
      result.push(node);
      continue;
    }
    const char = word[node.length];
    open.push(...types.map((type) => node.concat([{ type, char }])));
  }
  return result;
}

export async function guess(
  history: Responses,
  words: string[]
): Promise<GuessResult> {
  const candidates = words.filter(createFilter(history));
  if (candidates.length === 1) {
    return {
      word: candidates[0],
      confidence: 1,
    };
  }

  const selectedWords = new Set(
    history.map((h) => h.reduce((a, c) => a + c.char, ""))
  );
  const choosableWords = words.filter((word) => !selectedWords.has(word));
  const sorted = choosableWords
    .map((word) => {
      const scores = getPossibleResponses(word, history)
        .map((res) => {
          const score = candidates.filter(
            createFilter(history.concat([res]))
          ).length;
          if (score === 0) {
            return { possibility: 0, score: -1 };
          }
          return {
            possibility: score / candidates.length,
            score: candidates.length - score,
            xxx: (candidates.length - score) * (score / candidates.length),
          };
        })
        .filter(({ possibility }) => possibility > 0);
      const avg = weightedAverage(scores);
      return {
        word,
        confidence: avg,
        scores,
        len: scores.length,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
  debug(sorted.slice(0, 20).map(({ scores, ...rest }) => rest));
  return sorted[0];
}

function weightedAverage(
  values: { score: number; possibility: number }[]
): number {
  const numer = values.reduce((sum, v) => sum + v.score * v.possibility, 0);
  const denom = values.reduce((sum, v) => sum + v.possibility, 0);
  return numer / denom;
}
