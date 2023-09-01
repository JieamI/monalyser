import ts from "npm:typescript";
import type { ResolveContext } from "../types.ts";
import { resolveExport, resolveImport } from "./resolver.ts";
import { getSourceFileByDeclaration } from "../utils.ts";

/**
 * visit SourceFile recursively
 */
export const visitSourceNode = (params: {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  scope: RegExp[];
  visitedSource?: Set<string>;
}) => {
  const { sourceFile, checker, scope, visitedSource = new Set() } = params;
  const importOrExportDeclaration = (
    sourceFile as ts.SourceFile & { imports: ts.StringLiteral[] }
  ).imports
    .filter((item) => {
      const declaration = item.parent;
      return (
        (ts.isImportDeclaration(declaration) &&
          declaration.importClause?.isTypeOnly === false) ||
        (ts.isExportDeclaration(declaration) &&
          declaration.isTypeOnly === false)
      );
    })
    .map((item) => item.parent) as (
    | ts.ImportDeclaration
    | ts.ExportDeclaration
  )[];

  const ret: ResolveContext[] = [];
  for (const declaration of importOrExportDeclaration) {
    const source = getSourceFileByDeclaration({
      declaration,
      checker,
    });
    if (!source) continue;
    if (!scope.some((rule) => rule.test(source.fileName))) {
      if (ts.isImportDeclaration(declaration)) {
        ret.push(
          ...resolveImport({
            checker,
            declaration,
          })
        );
      }
      if (ts.isExportDeclaration(declaration)) {
        ret.push(
          ...resolveExport({
            checker,
            declaration,
          })
        );
      }
    } else {
      !visitedSource.has(source.fileName) &&
        ret.push(
          ...visitSourceNode({
            checker,
            scope,
            sourceFile: source,
            visitedSource,
          })
        );
      visitedSource.add(source.fileName);
    }
  }

  return ret;
};
