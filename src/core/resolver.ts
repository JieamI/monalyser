import ts from "npm:typescript";
import { getResolveContextById } from "../utils.ts";
import type { ResolveContext } from "../types.ts";

export const resolveImport = (params: {
  declaration: ts.ImportDeclaration;
  checker: ts.TypeChecker;
}): ResolveContext[] => {
  const { declaration, checker } = params;
  const ret: ResolveContext[] = [];
  // default import
  const defaultIdentifier = declaration.importClause?.name;
  if (defaultIdentifier) {
    const ctx = getResolveContextById({
      identifier: defaultIdentifier,
      checker,
      declaration,
      isDefaultImport: true,
    });
    // identifier should al
    ctx && ret.push(ctx);
  }

  // named import
  const namedBindings = declaration.importClause?.namedBindings;
  if (namedBindings && ts.isNamedImports(namedBindings!)) {
    namedBindings.elements
      .filter((item) => !item.isTypeOnly)
      .forEach((item) => {
        const ctx = getResolveContextById({
          identifier: item.propertyName ?? item.name,
          checker,
          declaration,
        });
        ctx && ret.push(ctx);
      });
  }
  // namespace import
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    const nsIdentifier = namedBindings.name;
    const ctx = getResolveContextById({
      identifier: nsIdentifier,
      checker,
      declaration,
    });
    ctx && ret.push(ctx);
  }

  return ret;
};

export const resolveExport = (params: {
  declaration: ts.ExportDeclaration;
  checker: ts.TypeChecker;
}): ResolveContext[] => {
  const { declaration, checker } = params;
  const ret: ResolveContext[] = [];

  const exportClause = declaration.exportClause;

  if (exportClause) {
    // namespace export
    if (ts.isNamespaceExport(exportClause)) {
      const ctx = getResolveContextById({
        identifier: exportClause.name,
        checker,
        declaration,
      });
      ctx && ret.push(ctx);
    }

    if (ts.isNamedExports(exportClause)) {
      exportClause.elements
        .filter((item) => !item.isTypeOnly)
        .forEach((item) => {
          const ctx = getResolveContextById({
            identifier: item.propertyName ?? item.name,
            checker,
            declaration,
          });
          ctx && ret.push(ctx);
        });
    }
  } else {
    // re-export
    const ctx = getResolveContextById({
      identifier: declaration.moduleSpecifier!,
      checker,
      declaration,
    });
    ctx && ret.push(ctx);
  }

  return ret;
};
