import type ts from "npm:typescript";

export interface ImportContext {
  importer: string;
  location: string;
  typeInString: string;
  typeFlag: keyof typeof ts.TypeFlags;
  typeObject: ts.Type;
  symbol: ts.Symbol;
  moduleSpecifier: ts.Expression;
  children?: ImportContext[];
}

export type SourceFileSymbol = ts.Symbol & { valueDeclaration: ts.SourceFile };
