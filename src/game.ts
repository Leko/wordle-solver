import { createFilter } from "./filter.js";
import { guess, GuessResult } from "./guess.js";
import { Responses, ResponseLine, ResponseType } from "./repl.js";
import { baseLogger } from "./logger.js";

const debug = baseLogger.extend("game");

type GameResult = {
  word: string;
  responses: Responses;
};

export async function start({
  responses = [],
  maxTurns,
  words,
  getResponse,
}: {
  responses?: Responses;
  maxTurns: number;
  words: string[];
  getResponse: (state: {
    turn: number;
    guessed: GuessResult;
  }) => Promise<ResponseLine>;
}): Promise<GameResult> {
  let turn = responses.length + 1;
  while (turn <= maxTurns) {
    debug(`turn ${turn}`);
    const candidates = words.filter(createFilter(responses));
    if (candidates.length <= 20) {
      debug(`${candidates.length} words remaining: ${candidates.join(", ")}`);
    } else {
      debug(
        `${candidates.length} words remaining. Too much candidates to list.`
      );
    }

    debug(`guessing...`);
    const guessResult = await guess(responses, words);
    debug(
      `guess: ${guessResult.word}(score:${guessResult.confidence.toFixed(2)})`
    );

    const response = await getResponse({ turn, guessed: guessResult });
    responses.push(response);
    if (response.every((res) => res.type === ResponseType.Exact)) {
      return { word: candidates[0], responses };
    }
    turn++;
  }
  throw new Error("Failed to solve");
}
