import { handler } from "./handler.ts";

import { program } from "npm:commander";

export const run = (
  handler: (params: {
    entryPath: string;
    scope: string[];
    out?: string;
    stdout?: boolean;
  }) => void
) => {
  program
    .name("monalyser")
    .usage("--out path/to/file --scope src __tests__/index.test.ts")
    .description("statically analyze ts code and generate mock code")
    .option("--stdout", "writing to the standard output")
    .option(
      "--out <path:string>",
      "The file path to which the mock needs to be written"
    )
    .requiredOption(
      "--scope <path:regex...>",
      "The path of module which is out of the scope will be mocked"
    )
    .argument("<path:string>", "The path of entry")

    .action(
      (
        entryPath: string,
        options: { stdout: boolean; out: string; scope: string[] }
      ) => {
        const { stdout, out, scope } = options;
        handler({
          entryPath,
          out,
          scope,
          stdout,
        });
      }
    );

  program.parse();
};

run(handler);
