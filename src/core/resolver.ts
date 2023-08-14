import ts from "npm:typescript";
import { getSymbol, getImportContext } from "../utils.ts";
import type { ImportContext } from "../types.ts";

export const resolveImport = (params: {
  declaration: ts.ImportDeclaration;
  checker: ts.TypeChecker;
}): ImportContext[] => {
  const { declaration, checker } = params;
  const ret: ImportContext[] = [];
  // default import
  const defaultIdentifier = declaration.importClause?.name;
  if (defaultIdentifier) {
    const symbol = getSymbol({
      expression: defaultIdentifier,
      checker,
    });
    symbol && ret.push(getImportContext({ symbol, checker, declaration }));
  }

  // named import
  const namedBindings = declaration.importClause?.namedBindings;
  if (namedBindings && ts.isNamedImports(namedBindings!)) {
    namedBindings.elements
      .filter((item) => !item.isTypeOnly)
      .forEach((item) => {
        const namedIdentifier = item.name;
        const symbol = getSymbol({
          expression: namedIdentifier,
          checker,
        });
        symbol && ret.push(getImportContext({ symbol, checker, declaration }));
      });
  }
  // namespace import
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    const nsIdentifier = namedBindings.name;
    const symbol = getSymbol({
      expression: nsIdentifier,
      checker,
    });
    symbol && ret.push(getImportContext({ symbol, checker, declaration }));
  }

  return ret;
};

export const resolveExport = (params: {
  declaration: ts.ExportDeclaration;
  checker: ts.TypeChecker;
}): ImportContext[] => {
  const { declaration, checker } = params;
  const ret: ImportContext[] = [];

  const exportClause = declaration.exportClause;

  if (exportClause) {
    // namespace export
    if (ts.isNamespaceExport(exportClause)) {
      const symbol = getSymbol({
        expression: exportClause.name,
        checker,
      });
      symbol &&
        ret.push(
          getImportContext({
            symbol,
            checker,
            declaration,
          })
        );
    }

    if (ts.isNamedExports(exportClause)) {
      exportClause.elements
        .filter((item) => !item.isTypeOnly)
        .forEach((item) => {
          const symbol = getSymbol({
            expression: item.name,
            checker,
          });
          symbol &&
            ret.push(
              getImportContext({
                symbol,
                checker,
                declaration,
              })
            );
        });
    }
  } else {
    // re-export
    const symbol = getSymbol({
      expression: declaration.moduleSpecifier!,
      checker,
    });

    symbol &&
      ret.push(
        getImportContext({
          symbol,
          checker,
          declaration,
        })
      );
  }

  return ret;
};
