import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
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

describe("CORS", () => {
  it("permite requisições da origem configurada (Access-Control-Allow-Origin)", async () => {
    const app = buildServer({
      corsConfig: { webUrl: "http://localhost:3000" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:3000" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("não libera Access-Control-Allow-Origin pra uma origem diferente da configurada", async () => {
    const app = buildServer({
      corsConfig: { webUrl: "http://localhost:3000" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://origem-nao-autorizada.example.com" },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Rate limit", () => {
  it("inclui os headers de rate limit na resposta", async () => {
    const app = buildServer();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.headers["x-ratelimit-limit"]).toBe("100");
    expect(response.headers).toHaveProperty("x-ratelimit-remaining");
  });

  it("retorna 429 depois de exceder o limite na janela de tempo", async () => {
    const app = buildServer();

    let lastResponse;
    for (let i = 0; i < 101; i++) {
      lastResponse = await app.inject({ method: "GET", url: "/health" });
    }

    expect(lastResponse?.statusCode).toBe(429);
  });
});

describe("error handler global (validação zod)", () => {
  it("retorna { error: mensagem } quando uma rota com schema nativo recebe input inválido", async () => {
    const app = buildServer();
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        "/__test-validation__",
        { schema: { querystring: z.object({ name: z.string().min(4) }) } },
        async () => ({ ok: true }),
      );

    const response = await app.inject({
      method: "GET",
      url: "/__test-validation__?name=ab",
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toBe("Bad Request");
  });
});
