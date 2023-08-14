import ts from "npm:typescript";
import type { ImportContext, SourceFileSymbol } from "./types.ts";

export const getSymbol = (params: {
  expression: ts.Expression;
  checker: ts.TypeChecker;
}): ts.Symbol | undefined => {
  const { checker, expression } = params;
  let symbol = checker.getSymbolAtLocation(expression);

  try {
    symbol = symbol ? checker.getAliasedSymbol(symbol) : symbol;
  } catch (e) {
    console.error("[getAliasedSymbol]: ", e);
  }
  return symbol;
};

export const formatTypeFlag = (flag: ts.TypeFlags) => {
  const TypeFlags = ts.TypeFlags;
  return Object.entries(TypeFlags).find(
    ([_, v]) => v === flag
  )![0] as keyof typeof ts.TypeFlags;
};

export const getImportContext = (params: {
  symbol: ts.Symbol;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  checker: ts.TypeChecker;
}): ImportContext => {
  const { symbol, checker, declaration } = params;
  const commonContext = {
    importer: declaration.getSourceFile().fileName,
    moduleSpecifier: declaration.moduleSpecifier,
  } as Pick<ImportContext, "moduleSpecifier" | "importer">;

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

export const getExportsofNamespace = (params: {
  symbol: SourceFileSymbol;
  declaration: ts.ImportDeclaration | ts.ExportDeclaration;
  checker: ts.TypeChecker;
  ctx: ImportContext;
}) => {
  const { checker, symbol, declaration, ctx } = params;
  const children = [];
  const exportedSymbols = checker.getExportsOfModule(symbol).filter(
    (item) =>
      // ignore type-export
      !ts.isTypeAliasDeclaration(item.declarations?.[0] as ts.Node) &&
      !ts.isInterfaceDeclaration(item.declarations?.[0] as ts.Node)
  );
  for (const exportedSymbol of exportedSymbols) {
    const importContext = getImportContext({
      symbol: exportedSymbol,
      checker,
      declaration,
    });
    children.push(importContext);
    // 2097152 refers to aliased symbol
    if (exportedSymbol.getFlags() === 2097152) {
      // handle aliased symbol
      const aliasedSymbol = checker.getAliasedSymbol(exportedSymbol);
      if (isSourceFileSymbol(aliasedSymbol)) {
        getExportsofNamespace({
          symbol: aliasedSymbol,
          ctx: importContext,
          declaration,
          checker,
        });
      }
    }
  }
  ctx.children = children;
};
