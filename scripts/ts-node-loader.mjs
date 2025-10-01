import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const TS_EXTENSIONS = new Set([".ts", ".tsx"]);
const PROJECT_ROOT = process.cwd();

function resolveWithExtensions(candidatePath) {
  const possibilities = [
    candidatePath,
    `${candidatePath}.ts`,
    `${candidatePath}.tsx`,
    path.join(candidatePath, "index.ts"),
    path.join(candidatePath, "index.tsx"),
  ];

  for (const possible of possibilities) {
    try {
      const stats = statSync(possible);
      if (stats.isFile()) {
        return possible;
      }
    } catch {
      // continue searching
    }
  }

  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  const { parentURL } = context;

  if (specifier.startsWith("@/")) {
    const absolutePath = path.join(PROJECT_ROOT, specifier.slice(2));
    const resolved = resolveWithExtensions(absolutePath);
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentPath = parentURL ? fileURLToPath(parentURL) : path.join(PROJECT_ROOT, "index.ts");
    const absolutePath = path.resolve(path.dirname(parentPath), specifier);
    const resolved = resolveWithExtensions(absolutePath);
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  const extension = path.extname(url);

  if (TS_EXTENSIONS.has(extension)) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, "utf8");

    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        resolveJsonModule: true,
        sourceMap: true,
      },
      fileName: filePath,
    });

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
