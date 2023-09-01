import { visitSourceNode } from "../core/visit.ts";
import { generateMock } from "../gen/vitest.ts";
import {
  dedupResolveContext,
  getSourceFileBySpecifier,
  groupResolveContext,
  validateFilePath,
} from "../utils.ts";
import path from "node:path";
import ts from "npm:typescript";

export const handler = async (params: {
  entryPath: string;
  scope: string[];
  out?: string;
  stdout?: boolean;
}) => {
  const { entryPath, scope, out, stdout } = params;

  const resolvedEntryPath = path.resolve(Deno.cwd(), entryPath);
  if (!(await validateFilePath(resolvedEntryPath))) {
    throw new Error("The path of entry may not exist");
  }
  const resolvedOutPath = out ? path.resolve(Deno.cwd(), out) : undefined;
  if (resolvedOutPath && !(await validateFilePath(resolvedEntryPath))) {
    throw new Error("The path of <out> may not exist");
  }
  const scopeRegex = scope.map((item) => new RegExp(item));
  const targetPath = resolvedOutPath ?? entryPath;

  const compileOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  };
  const program = ts.createProgram([entryPath], compileOptions);
  const sourceFile = program.getSourceFile(entryPath)!;
  const checker = program.getTypeChecker();

  let mockString = "";
  const ret = visitSourceNode({
    sourceFile,
    checker,
    scope: scopeRegex,
  });
  const ctxArray = groupResolveContext(
    ret,
    (ctx) => `${ctx.importer}-${ctx.moduleSpecifier.getText()}`
  );
  for (const groupedCtx of ctxArray) {
    // deduplication based on id
    const groupedCtxSet = dedupResolveContext(
      groupedCtx,
      (ctx) => ctx.identifier
    );
    mockString = mockString.concat(
      `${generateMock({
        filePath: targetPath,
        groupedCtx: groupedCtxSet,
        targetPath: getSourceFileBySpecifier({
          checker,
          specifier: groupedCtx[0].moduleSpecifier,
        })!,
      })}\n`
    );
  }
  if (stdout) {
    Deno.stdout.write(new TextEncoder().encode(mockString));
    return;
  }
  const originContent = await Deno.readTextFile(targetPath);
  await Deno.writeTextFile(targetPath, `${mockString}\n${originContent}`);
};
