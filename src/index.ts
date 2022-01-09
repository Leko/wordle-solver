import readline from "node:readline";
import chalk from "chalk";
import arg from "arg";
import words from "../words.json";
import { highlight, read, ResponseType } from "./repl.js";
import { MAX_TURNS } from "./constants.js";
import { start } from "./game.js";
import { baseLogger } from "./logger.js";
import { GuessResult } from "./guess";

const debug = baseLogger.extend("app");

function emulateResponse(word: string, answer: string): ResponseLine {
  const answerSet = new Set(answer);
  return word.split("").map((char, i): ResponseLine[number] => {
    if (char === answer[i]) {
      return { type: ResponseType.Exact, char };
    }
    if (answerSet.has(char)) {
      return { type: ResponseType.WrongSpot, char };
    }
    return { type: ResponseType.Wrong, char };
  });
}

async function repl() {
  while (1) {
    const response = await read(rl);
    if (response) {
      return response;
    }
  }
  throw new Error("unreachable");
}

async function emulate({ guessed }: { guessed: GuessResult }) {
  let word = guessed.word;
  const res = emulateResponse(word, cliOptions["--emulate"]!);
  debug("input:", highlight(res));
  return res;
}

const cliOptions = arg({
  "--emulate": String,
});
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

start({
  maxTurns: MAX_TURNS,
  words,
  getResponse: cliOptions["--emulate"] ? emulate : repl,
})
  .then((result) => {
    console.log("WIN! The answer is", chalk.bold.whiteBright(result.word));
    result.responses.forEach((res) => {
      debug(highlight(res));
    });
  })
  .catch((e: Error) => {
    console.error(e.stack);
  })
  .finally(() => {
    rl.close();
  });
