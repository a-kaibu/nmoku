import { defineConfig } from "vite-plus";

export default defineConfig({
  // GitHub Pages (https://a-kaibu.github.io/nmoku/) でも相対パスで動くように
  base: "./",
  test: {
    include: ["src/**/*.test.ts"],
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
