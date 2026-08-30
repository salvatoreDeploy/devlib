import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("Swagger/OpenAPI", () => {
  it("expõe o spec OpenAPI em /docs/json incluindo a rota /health", async () => {
    const app = buildServer();

    const response = await app.inject({ method: "GET", url: "/docs/json" });

    expect(response.statusCode).toBe(200);
    const spec = response.json();
    expect(spec.paths).toHaveProperty("/health");
  });

  it("expõe a UI do Swagger em /docs/", async () => {
    const app = buildServer();

    const response = await app.inject({ method: "GET", url: "/docs/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });
});
