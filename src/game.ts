import ora from "ora";
import { createFilter } from "./filter.js";
import { guess, GuessResult, WorkerPool } from "./guess.js";
import { Responses, ResponseLine, ResponseType } from "./repl.js";
import { baseLogger } from "./logger.js";

const debug = baseLogger.extend("game");

type GameResult = {
  word: string;
  responses: Responses;
};

export interface CacheImpl {
  get: (context: {
    turn: number;
    responses: Responses;
  }) => Promise<GuessResult | null>;
  set: (
    guessed: GuessResult,
    context: {
      turn: number;
      responses: Responses;
    }
  ) => Promise<void>;
}

export async function start({
  responses = [],
  maxTurns,
  words,
  workerPool,
  cache,
  getResponse,
}: {
  responses?: Responses;
  maxTurns: number;
  words: string[];
  workerPool: WorkerPool;
  cache?: CacheImpl;
  getResponse: (state: {
    turn: number;
    guessed: GuessResult;
  }) => Promise<ResponseLine>;
}): Promise<GameResult> {
  for (let turn = responses.length + 1; turn <= maxTurns; turn++) {
    debug(`turn ${turn}`);
    const candidates = words.filter(createFilter(responses));
    if (candidates.length <= 20) {
      debug(`${candidates.length} words remaining: ${candidates.join(", ")}`);
    } else {
      debug(
        `${candidates.length} words remaining. Too much candidates to list.`
      );
    }

    performance.mark("GUESS_START");
    let guessed = cache ? await cache.get({ turn, responses }) : null;
    if (!guessed) {
      const spinner = ora({ text: "guessing...", discardStdin: false }).start();
      guessed = await guess(responses, words, workerPool);
      spinner.stop().clear();
    }
    await cache?.set(guessed, { turn, responses });
    performance.mark("GUESS_END");
    const spent = performance.measure("x", "GUESS_START", "GUESS_END").duration;
    performance.clearMeasures();
    performance.clearMarks();
    debug(
      `guessed: ${guessed.word} (score:${guessed.confidence.toFixed(
        2
      )}, time:${spent.toFixed(2)}ms)`
    );

    const response = await getResponse({ turn, guessed });
    responses.push(response);
    if (response.every((res) => res.type === ResponseType.Exact)) {
      return { word: candidates[0], responses };
    }
  }
  throw new Error("Failed to solve");
}
