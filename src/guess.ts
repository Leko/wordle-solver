import path from "node:path";
import { Worker } from "node:worker_threads";
import * as Comlink from "comlink";
import nodeAdapter from "comlink/dist/esm/node-adapter.mjs";
import { Responses } from "./repl.js";
import { createFilter } from "./filter.js";
import { baseLogger } from "./logger.js";
import type { evaluate } from "./guess.worker.js";

const debug = baseLogger.extend("guess");

export type GuessResult = {
  word: string;
  confidence: number; // 0-1
};
export type WorkerPool = Comlink.Remote<{ evaluate: typeof evaluate }>[];

export function prepareWorkerPool(size: number): WorkerPool {
  return Array.from(new Array(size), () => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const worker = new Worker(path.join(__dirname, "guess.worker.js"));
    return Comlink.wrap(nodeAdapter(worker));
  });
}

export async function guess(
  history: Responses,
  words: string[],
  workerPool: WorkerPool
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
  const availableWords = words.filter((word) => !selectedWords.has(word));
  const chunks = chunk(
    availableWords,
    Math.ceil(availableWords.length / workerPool.length)
  );
  const scores = await Promise.all(
    chunks.map(async (words, poolIndex) => {
      const subResult = [];
      for (const word of words) {
        subResult.push({
          word,
          confidence: await workerPool[poolIndex].evaluate(word, {
            history,
            words: candidates,
          }),
        });
      }
      return subResult;
    })
  );
  const sorted = scores.flat().sort((a, b) => b.confidence - a.confidence);
  debug(sorted.slice(0, 20));
  return sorted[0];
}

function chunk<T>(arr: T[], chunkSize = 1, cache: T[][] = []): T[][] {
  const tmp = [...arr];
  if (chunkSize <= 0) return cache;
  while (tmp.length) cache.push(tmp.splice(0, chunkSize));
  return cache;
}
