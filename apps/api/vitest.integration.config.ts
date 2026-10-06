import { defineConfig } from "vitest/config";

// specs `*.integration.spec.ts` contra um Postgres real (banco `_test`, ver
// test/integration/test-database-url.ts). Rodar com `npm run test:integration`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.spec.ts"],
    globalSetup: ["./test/integration/global-setup.ts"],
    setupFiles: ["./test/integration/setup.ts"],
    // todos os arquivos dividem o mesmo banco e fazem TRUNCATE entre testes
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
