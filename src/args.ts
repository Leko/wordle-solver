import arg from "arg";

type CLIOption = {
  emulate?: string;
  words?: string;
  cache?: string;
};

export function parse(argv = process.argv): CLIOption {
  const args = arg(
    {
      "--emulate": String,
      "--words": String,
      "--cache": String,
    },
    { argv }
  );
  return {
    emulate: args["--emulate"],
    words: args["--words"],
    cache: args["--cache"],
  };
}
