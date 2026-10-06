import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    // specs de integração precisam de Postgres — rodam só via
    // `npm run test:integration` (vitest.integration.config.ts)
    exclude: [...configDefaults.exclude, "**/*.integration.spec.ts"],
  },
});
