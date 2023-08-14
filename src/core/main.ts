/* eslint-disable */
import path from "node:path";
import ts from "npm:typescript";
import type { ImportContext } from "../types.ts";
import { resolveExport, resolveImport } from "./resolver.ts";
import { getSourceFileByDeclaration } from "../utils.ts";

const entryPath = "../case/01/exports.ts";
const resolvedPath = path.resolve(
  new URL(".", import.meta.url).pathname,
  entryPath
);
const locationNeedtoMock = [/wdnmd/];

const compileOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.ReactJSX,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
};
// const host = ts.createCompilerHost(compileOptions, true);
const program = ts.createProgram([resolvedPath], compileOptions);
const sourceFile = program.getSourceFile(resolvedPath)!;
const typeChecker = program.getTypeChecker();

/**
 * visit SourceFile recursively
 */
const visitSourceNode = (sourceFile: ts.SourceFile): void => {
  const importOrExportDeclaration = (
    sourceFile as ts.SourceFile & { imports: ts.StringLiteral[] }
  ).imports
    .filter((item) => {
      const declaration = item.parent;
      return (
        (ts.isImportDeclaration(declaration) &&
          declaration.importClause?.isTypeOnly === false) ||
        (ts.isImportDeclaration(declaration) &&
          declaration.importClause?.isTypeOnly === false)
      );
    })
    .map((item) => item.parent) as (
    | ts.ImportDeclaration
    | ts.ExportDeclaration
  )[];

  const ret: ImportContext[] = [];
  for (const declaration of importOrExportDeclaration) {
    const source = getSourceFileByDeclaration({
      declaration,
      checker: typeChecker,
    });
    if (
      source &&
      locationNeedtoMock.some((rule) => rule.test(source.fileName))
    ) {
      visitSourceNode(source);
      continue;
    }

    ts.isImportDeclaration(declaration)
      ? ret.push(
          ...resolveImport({
            checker: typeChecker,
            declaration,
          })
        )
      : ret.push(
          ...resolveExport({
            checker: typeChecker,
            declaration,
          })
        );
  }
  console.log(ret);
};

visitSourceNode(sourceFile);
