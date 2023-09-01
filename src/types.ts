import type ts from "npm:typescript";

export interface ResolveContext {
  importer: string;
  location: string;
  typeInString: string;
  typeFlag: keyof typeof ts.TypeFlags;
  typeObject: ts.Type;
  identifier?: string;
  symbol: ts.Symbol;
  moduleSpecifier: ts.Expression;
  children?: ResolveContext[];
}

export type SourceFileSymbol = ts.Symbol & { valueDeclaration: ts.SourceFile };

type LiteralSymbolFlags = keyof typeof ts.SymbolFlags;

export interface MockContext {
  filePath: string;
  groupedCtx: ResolveContext[];
  targetPath: string; // the absolute path of module specifier
}
