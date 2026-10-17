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

  it("libera PATCH, PUT e DELETE no preflight, não só o default GET/HEAD/POST do @fastify/cors", async () => {
    const app = buildServer({
      corsConfig: { webUrl: "http://localhost:3000" },
    });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/projects/00000000-0000-0000-0000-000000000000",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PATCH",
      },
    });

    const allowedMethods = response.headers["access-control-allow-methods"]
      ?.toString()
      .split(",")
      .map((method) => method.trim());
    expect(allowedMethods).toEqual(
      expect.arrayContaining(["PATCH", "PUT", "DELETE"]),
    );
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

describe("error handler global (5xx)", () => {
  function buildServerWithLogCapture() {
    const lines: string[] = [];
    const app = buildServer({
      logger: {
        level: "error",
        stream: { write: (line: string) => lines.push(line) },
      },
    });
    return { app, lines };
  }

  it("responde mensagem genérica em 500 sem expor error.message (ex: SQL do Drizzle)", async () => {
    const app = buildServer();
    app.get("/__test-500__", async () => {
      throw new Error('Failed query: select "id" from "projects" where "id" = $1');
    });

    const response = await app.inject({ method: "GET", url: "/__test-500__" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Erro interno do servidor" });
    expect(response.body).not.toContain("Failed query");
  });

  it("mantém o status de um 5xx explícito, mas com a mensagem genérica", async () => {
    const app = buildServer();
    app.get("/__test-503__", async () => {
      throw Object.assign(new Error("upstream detalhado indisponível"), {
        statusCode: 503,
      });
    });

    const response = await app.inject({ method: "GET", url: "/__test-503__" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "Erro interno do servidor" });
  });

  it("mantém a mensagem original em erros 4xx não tratados", async () => {
    const app = buildServer();
    app.get("/__test-4xx__", async () => {
      throw Object.assign(new Error("Payload grande demais"), {
        statusCode: 413,
      });
    });

    const response = await app.inject({ method: "GET", url: "/__test-4xx__" });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: "Payload grande demais" });
  });

  it("registra o erro real no log em 5xx", async () => {
    const { app, lines } = buildServerWithLogCapture();
    app.get("/__test-500-log__", async () => {
      throw new Error('Failed query: select "id" from "projects"');
    });

    await app.inject({ method: "GET", url: "/__test-500-log__" });

    expect(lines.join("")).toContain("Failed query");
  });

  it("não registra erro no log em 4xx", async () => {
    const { app, lines } = buildServerWithLogCapture();
    app.get("/__test-4xx-log__", async () => {
      throw Object.assign(new Error("Payload grande demais"), {
        statusCode: 413,
      });
    });

    await app.inject({ method: "GET", url: "/__test-4xx-log__" });

    expect(lines).toEqual([]);
  });
});
