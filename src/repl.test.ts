import { EOL } from "node:os";
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable, Writable } from "node:stream";
import { describe, it, expect } from "vitest";
import { parse, read } from "./repl";

async function* mockReadable(lines: string[]) {
  for (const line of lines) {
    yield line;
    yield EOL;
  }
}

describe("repl", () => {
  describe("parse", () => {
    it("parses `x` as exact", () => {
      expect(parse("a", "x")).toEqual([{ char: "a", type: "exact" }]);
    });
    it("parses `-` as wrongSpot", () => {
      expect(parse("a", "-")).toEqual([{ char: "a", type: "wrongSpot" }]);
    });
    it("parses `.` as wrong", () => {
      expect(parse("a", ".")).toEqual([{ char: "a", type: "wrong" }]);
    });
    it("throws error if anything else", () => {
      expect(() => parse("a", "?")).toThrowError(/invalid response/);
    });
  });

  describe("read", () => {
    it("returns response if input is valid", async () => {
      const rl = createInterface({
        input: Readable.from(mockReadable(["abcde", "x-.-x", ""])),
      });
      expect(await read(rl)).toEqual([
        { char: "a", type: "exact" },
        { char: "b", type: "wrongSpot" },
        { char: "c", type: "wrong" },
        { char: "d", type: "wrongSpot" },
        { char: "e", type: "exact" },
      ]);
    });
    it("returns null if the input is canceled", async () => {
      const rl = createInterface({
        input: Readable.from(mockReadable(["abcde", "x-.-x", "n"])),
      });
      expect(await read(rl)).toEqual(null);
    });
  });
});
