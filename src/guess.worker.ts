import { parentPort } from "worker_threads";
import * as Comlink from "comlink";
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
import { ResponseLine, Responses, ResponseType } from "./repl.js";
import { WORD_LENGTH } from "./constants.js";
import { createFilter } from "./filter.js";

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

export function evaluate(
  word: string,
  { words, history }: { words: string[]; history: Responses }
): number {
  const scores = getPossibleResponses(word, history)
    .map((res) => {
      const score = words.filter(createFilter(history.concat([res]))).length;
      if (score === 0) {
        return { possibility: 0, score: -1 };
      }
      return {
        possibility: score / words.length,
        score: words.length - score,
      };
    })
    .filter(({ possibility }) => possibility > 0);
  return weightedAverage(scores);
}

function weightedAverage(
  values: { score: number; possibility: number }[]
): number {
  const numer = values.reduce((sum, v) => sum + v.score * v.possibility, 0);
  const denom = values.reduce((sum, v) => sum + v.possibility, 0);
  return numer / denom;
}

if (parentPort) {
  Comlink.expose({ evaluate }, nodeEndpoint(parentPort));
}
