import { describe, expect, it } from "vitest";
import {
  PG_INVALID_TEXT_REPRESENTATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "./pg-errors";

describe("pgErrorCode", () => {
  it("lê o código direto do erro do driver pg (error.code)", () => {
    const error = Object.assign(new Error("invalid input syntax"), {
      code: "22P02",
    });

    expect(pgErrorCode(error)).toBe("22P02");
  });

  it("lê o código do erro original quando embrulhado pelo Drizzle (error.cause.code)", () => {
    const error = new Error('Failed query: select "id" from "projects"', {
      cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
    });

    expect(pgErrorCode(error)).toBe("23505");
  });

  it("devolve undefined quando o erro não tem código do Postgres", () => {
    expect(pgErrorCode(new Error("qualquer"))).toBeUndefined();
    expect(pgErrorCode(new Error("x", { cause: new Error("y") }))).toBeUndefined();
  });

  it("devolve undefined para valores que não são objeto", () => {
    expect(pgErrorCode(null)).toBeUndefined();
    expect(pgErrorCode(undefined)).toBeUndefined();
    expect(pgErrorCode("22P02")).toBeUndefined();
  });

  it("expõe os códigos usados pela API", () => {
    expect(PG_INVALID_TEXT_REPRESENTATION).toBe("22P02");
    expect(PG_UNIQUE_VIOLATION).toBe("23505");
  });
});
