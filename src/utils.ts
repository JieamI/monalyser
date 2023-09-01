import ts from "npm:typescript";
import type { ResolveContext, SourceFileSymbol } from "./types.ts";

export const validateFilePath = async (path: string) => {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile ? true : false;
  } catch {
    return false;
  }
};

export const getSourceFileBySpecifier = (params: {
  specifier: ts.Expression;
  checker: ts.TypeChecker;
}) => {
  const { specifier, checker } = params;
  const symbol = checker.getSymbolAtLocation(specifier);
  if (symbol && isSourceFileSymbol(symbol)) {
    return symbol.valueDeclaration.fileName;
  }
  return null;
};

export const getSymbol = (params: {
  expression: ts.Expression;
  checker: ts.TypeChecker;
}): ts.Symbol | undefined => {
  const { checker, expression } = params;
  let symbol = checker.getSymbolAtLocation(expression);

  try {
    symbol = symbol ? checker.getAliasedSymbol(symbol) : symbol;
  } catch (e) {
    // console.error("[getAliasedSymbol]: ", e);
  }
  return symbol;
};

export const formatTypeFlag = (flag: ts.TypeFlags) => {
  const TypeFlags = ts.TypeFlags;
  return Object.entries(TypeFlags).find(
    ([_, v]) => v === flag
  )![0] as keyof typeof ts.TypeFlags;
};

export const getResolveContextById = (params: {
  identifier: ts.Expression;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  checker: ts.TypeChecker;
  isDefaultImport?: boolean;
}): ResolveContext | null => {
  const { identifier, checker, declaration, isDefaultImport } = params;
  const symbol = getSymbol({
    expression: identifier,
    checker,
  });
  if (!symbol?.valueDeclaration) return null;
  const contextWithoutIdentifier = getResolveContextBySymbol({
    symbol,
    declaration,
    checker,
  });
  return {
    ...contextWithoutIdentifier,
    identifier: isDefaultImport ? "default" : identifier.getText(),
  };
};

export const getResolveContextBySymbol = (params: {
  symbol: ts.Symbol;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  checker: ts.TypeChecker;
}): Omit<ResolveContext, "identifier"> => {
  const { symbol, declaration, checker } = params;
  const commonContext = {
    importer: declaration.getSourceFile().fileName,
    moduleSpecifier: declaration.moduleSpecifier,
  } as Pick<ResolveContext, "moduleSpecifier" | "importer" | "identifier">;

  const typeObject = checker.getTypeOfSymbol(symbol);

  return {
    location: symbol.valueDeclaration?.getSourceFile().fileName as string,
    typeInString: checker.typeToString(typeObject),
    typeFlag: formatTypeFlag(typeObject.getFlags()),
    typeObject,
    symbol,
    ...commonContext,
  };
};

export const getSourceFileByDeclaration = (params: {
  checker: ts.TypeChecker;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
}) => {
  const { declaration, checker } = params;
  const symbol = checker.getSymbolAtLocation(declaration.moduleSpecifier!);
  return symbol?.valueDeclaration?.getSourceFile();
};

export const isSourceFileSymbol = (
  symbol: ts.Symbol
): symbol is SourceFileSymbol => {
  const declaration = symbol.valueDeclaration;
  return !!(declaration && ts.isSourceFile(declaration));
};

export const groupResolveContext = (
  ctxArray: ResolveContext[],
  by: (ctx: ResolveContext) => unknown
) => {
  const ret = new Map<unknown, ResolveContext[]>();
  for (const ctx of ctxArray) {
    const groupedValue = by(ctx);
    const groupedCtx = ret.get(groupedValue);
    if (!groupedCtx) {
      ret.set(groupedValue, [ctx]);
    } else {
      groupedCtx.push(ctx);
    }
  }
  return [...ret.values()];
};

export const dedupResolveContext = (
  ctxArray: ResolveContext[],
  by: (ctx: ResolveContext) => unknown
) => {
  return [...new Map(ctxArray.map((ctx) => [by(ctx), ctx])).values()];
};

export const getExportsofNamespace = (params: {
  symbol: SourceFileSymbol;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  checker: ts.TypeChecker;
}): ResolveContext[] => {
  const { checker, symbol, declaration } = params;
  const children = [];
  const exportedSymbols = checker.getExportsOfModule(symbol).filter(
    (item) =>
      // ignore type-export
      !ts.isTypeAliasDeclaration(item.declarations?.[0] as ts.Node) &&
      !ts.isInterfaceDeclaration(item.declarations?.[0] as ts.Node)
  );
  for (const exportedSymbol of exportedSymbols) {
    const resolveContext = getResolveContextBySymbol({
      symbol: exportedSymbol,
      checker,
      declaration,
    });
    if (resolveContext) {
      children.push(resolveContext);
      // 2097152 refers to aliased symbol
      if (exportedSymbol.getFlags() === 2097152) {
        // handle aliased symbol
        const aliasedSymbol = checker.getAliasedSymbol(exportedSymbol);
        if (isSourceFileSymbol(aliasedSymbol)) {
          resolveContext.children = getExportsofNamespace({
            symbol: aliasedSymbol,
            declaration,
            checker,
          });
        }
      }
    }
  }
  return children;
};
