import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import readline from "node:readline";
import arg from "arg";
import chalk from "chalk";
import { releaseProxy } from "comlink";
import { highlight, read, ResponseLine, ResponseType } from "./repl.js";
import { MAX_TURNS } from "./constants.js";
import { CacheImpl, start } from "./game.js";
import { baseLogger } from "./logger.js";
import { GuessResult, prepareWorkerPool } from "./guess.js";

const debugApp = baseLogger.extend("app");
const debugCache = baseLogger.extend("cache");

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
  debugApp("input:", highlight(res));
  return res;
}

const cacheClient = (wordsMD5Sum: string): CacheImpl => ({
  async get({ turn }): Promise<GuessResult | null> {
    if (turn !== 1) {
      return null;
    }
    try {
      const cached = await fs.readFile(
        path.join(CACHE_BASE, wordsMD5Sum + ".json"),
        "utf8"
      );
      debugCache("hit:", cached);
      return JSON.parse(cached);
    } catch (e) {
      debugCache("miss:", (e as Error).message);
      return null;
    }
  },
  async set(guessed: GuessResult, { turn }): Promise<void> {
    if (turn !== 1) {
      return;
    }

    const filePath = path.join(CACHE_BASE, wordsMD5Sum + ".json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(guessed));
  },
});

const cliOptions = arg({
  "--emulate": String,
  "--words": String,
  "--cache": String,
});
const WORDS_PATH = path.join(
  process.cwd(),
  cliOptions["--words"] ?? "words.json"
);
const CACHE_BASE = path.join(process.cwd(), cliOptions["--cache"] ?? ".cache");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const workerPool = prepareWorkerPool(cpus().length - 1);

const wordsStr = await fs.readFile(WORDS_PATH, "utf8");
const wordsMD5Sum = createHash("md5").update(wordsStr).digest("hex");
const words = JSON.parse(wordsStr);

start({
  maxTurns: MAX_TURNS,
  words,
  workerPool,
  getResponse: cliOptions["--emulate"] ? emulate : repl,
  cache: cacheClient(wordsMD5Sum),
})
  .then((result) => {
    console.log("WIN! The answer is", chalk.bold.whiteBright(result.word));
    result.responses.forEach((res) => {
      debugApp(highlight(res));
    });
  })
  .catch((e: Error) => {
    console.error(e.stack);
  })
  .finally(() => {
    rl.close();
    workerPool.forEach((worker) => worker[releaseProxy]());
  });
