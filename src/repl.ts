import readline from "node:readline";
import chalk from "chalk";
import { WORD_LENGTH } from "./constants.js";

export enum ResponseType {
  Exact = "exact",
  WrongSpot = "wrongSpot",
  Wrong = "wrong",
}
type Response = {
  char: string;
  type: ResponseType;
};
export type ResponseLine = Response[];
export type Responses = ResponseLine[];

const colorCorrect = (text: string) => chalk.black.bgGreen(text);
const colorWrongSpot = (text: string) => chalk.black.bgYellow(text);
const colorWrong = (text: string) => chalk.white.bgGrey(text);

async function question(
  rl: readline.Interface,
  text: string,
  validate?: (answer: string) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    rl.question(chalk.dim(`> ${text}`), (answer) => {
      try {
        validate?.(answer);
        resolve(answer);
      } catch (e) {
        reject(e);
      }
    });
  }).catch((e) => {
    console.error(chalk.red((e as Error).message));
    return question(rl, text, validate);
  });
}

export function parse([...input]: string, [...response]: string): ResponseLine {
  return input.map((char, i): Response => {
    switch (response[i]) {
      case "x":
        return { char, type: ResponseType.Exact };
      case "-":
        return { char, type: ResponseType.WrongSpot };
      case ".":
        return { char, type: ResponseType.Wrong };
      default:
        throw new Error(`invalid response: ${response[i]}(${i})`);
    }
  }) as ResponseLine;
}

function validateInput(t: string) {
  if (!t) {
    throw new Error("input is required");
  }
  if (!new RegExp(`^[a-z]{${WORD_LENGTH}}$`).test(t)) {
    throw new Error(
      `input length must be ${WORD_LENGTH} and all chars must be lower case alphabets`
    );
  }
}

function validateResponse(t: string) {
  if (!t) {
    throw new Error("input is required");
  }
  if (!new RegExp(`^[x\\-.]{${WORD_LENGTH}}$`).test(t)) {
    throw new Error(
      `input length must be ${WORD_LENGTH} and all chars must be one of 'x', '-' or '.'`
    );
  }
}

const RESPONSE_EXAMPLE = [
  colorCorrect("x"),
  colorWrongSpot("-"),
  colorWrong("."),
].join(", ");

export function highlight(line: ResponseLine) {
  return line
    .map((r) => {
      switch (r.type) {
        case ResponseType.Exact:
          return colorCorrect(r.char);
        case ResponseType.WrongSpot:
          return colorWrongSpot(r.char);
        case ResponseType.Wrong:
          return colorWrong(r.char);
      }
    })
    .join("");
}

export async function read(
  rl: readline.Interface
): Promise<ResponseLine | null> {
  const input = await question(rl, `enter input: `, validateInput);
  const response = await question(
    rl,
    `enter response(${RESPONSE_EXAMPLE}): `,
    validateResponse
  );
  const parsed = parse(input, response);
  const textToConfirm = highlight(parsed);
  const res = await question(rl, `Is this correct? ${textToConfirm} [Y/n]`);
  if (res && res !== "y") {
    return null;
  }
  return parsed;
}
