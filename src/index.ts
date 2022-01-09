import readline from "node:readline";
import words from "../words.json";
import * as repl from "./repl.js";
import { MAX_TURNS } from "./constants.js";
import { start } from "./game.js";
import { baseLogger } from "./logger.js";
import chalk from "chalk";

const debug = baseLogger.extend("app");

console.log(words.filter((w) => typeof w !== "string"));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function emulateResponse(word: string, answer: string): repl.ResponseLine {
  const answerSet = new Set(answer);
  return word.split("").map((char, i): repl.ResponseLine[number] => {
    if (char === answer[i]) {
      return { type: repl.ResponseType.Exact, char };
    }
    if (answerSet.has(char)) {
      return { type: repl.ResponseType.WrongSpot, char };
    }
    return { type: repl.ResponseType.Wrong, char };
  });
}

start({
  maxTurns: MAX_TURNS,
  words,
  // async getResponse() {
  //   while (1) {
  //     const response = await repl.read(rl);
  //     if (response) {
  //       return response;
  //     }
  //   }
  //   throw new Error("unreachable");
  // },
  async getResponse({ guessed }) {
    let word = guessed.word;
    const res = emulateResponse(word, answer);
    debug("input:", repl.highlight(res));
    return res;
  },
})
  .then((result) => {
    console.log("WIN! The answer is", chalk.bold.whiteBright(result.word));
    result.responses.forEach((res) => {
      debug(repl.highlight(res));
    });
  })
  .catch((e: Error) => {
    console.error(e.stack);
  })
  .finally(() => {
    rl.close();
  });
