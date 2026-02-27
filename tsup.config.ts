import { defineConfig } from "tsup";
import { builtinModules } from "node:module";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  splitting: false,
  // Mark Node built-ins as external so CJS deps (gray-matter) can require() them.
  external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  // Inject CJS compat shim for gray-matter's require() calls.
  banner: {
    js: [
      "#!/usr/bin/env node",
      'import { createRequire as __$$createRequire } from "node:module";',
      "const require = __$$createRequire(import.meta.url);",
    ].join("\n"),
  },
});
