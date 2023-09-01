import { MockContext } from "../types.ts";
import path from "node:path";
import { isSourceFileSymbol } from "../utils.ts";

/**
 * The groupedCtx in MockContext should have same specifier and importer.
 * @param {MockContext} ctx
 * @returns {string}
 */
export const generateMock = (ctx: MockContext) => {
  const { filePath, groupedCtx, targetPath } = ctx;
  const importer = groupedCtx[0].importer;
  const specifier = groupedCtx[0].moduleSpecifier.getText();

  if (groupedCtx.some((ctx) => ctx.importer !== importer)) {
    throw new Error(
      "The groupedCtx in MockContext should have same importer field."
    );
  }

  let mockPath: string;
  // relative import
  if (specifier.startsWith(".")) {
    // compute the specifier relative to the test file
    const relativePath = path.relative(path.dirname(filePath), targetPath);
    mockPath = relativePath.startsWith(".")
      ? relativePath
      : `./${relativePath}`;
  } else {
    mockPath = specifier;
  }

  let bodyString = "";
  const normalCtx = groupedCtx.filter(
    (ctx) =>
      !isSourceFileSymbol(ctx.symbol) ||
      ctx.symbol.valueDeclaration.fileName !== targetPath
  );
  // if there is only resolveContext of namespace import in groupedContext, then this module should be mocked as proxy directly.
  if (!normalCtx.length) {
    bodyString = `
  return new Proxy(
    {},
    {
      has: () => true,
      get(target, prop) {
        if (prop === "then") {
          return undefined;
        }
        return vi.fn();
      },
    }
  );`;
  } else {
    bodyString = `
  return {${normalCtx.map((ctx) => {
    const { typeInString, typeFlag, symbol } = ctx;
    return `
    // ${typeFlag} - ${typeInString}
    ${ctx.identifier ?? "unknown"}: ${
      isSourceFileSymbol(symbol) ? "{}" : "vi.fn()"
    }`;
  })}
  }`;
  }
  return `
/**
 * This mock is generated for:
 * @module ${importer}
 * @import ${specifier}
 */
vi.mock(${mockPath}, () => {
${bodyString}
})
`;
};
