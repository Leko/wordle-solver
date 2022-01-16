import { describe, expect, it } from "vitest";
import { parse } from "./args";

describe("args", () => {
  describe("parse", () => {
    it("can parse --emulate as string", () => {
      expect(parse(["--emulate", "hoge"])).toMatchObject({ emulate: "hoge" });
    });
    it("can parse --words as string", () => {
      expect(parse(["--words", "hoge"])).toMatchObject({ words: "hoge" });
    });
    it("can parse --cache as string", () => {
      expect(parse(["--cache", "hoge"])).toMatchObject({ cache: "hoge" });
    });
  });
});
