import { describe, expect, it } from "vitest";
import { getInitials } from "./initials";

describe("getInitials", () => {
  it("retorna a primeira letra do primeiro e do último nome, maiúsculas", () => {
    expect(getInitials("Ana Ribeiro", "ana@example.com")).toBe("AR");
  });

  it("usa só o primeiro e o último quando há nome do meio", () => {
    expect(getInitials("Ana Paula Ribeiro", "ana@example.com")).toBe("AR");
  });

  it("retorna uma letra só quando o nome tem uma única palavra", () => {
    expect(getInitials("Ana", "ana@example.com")).toBe("A");
  });

  it("cai pra inicial do e-mail quando não há nome", () => {
    expect(getInitials(null, "ana@example.com")).toBe("A");
    expect(getInitials(undefined, "ana@example.com")).toBe("A");
  });

  it("cai pra inicial do e-mail quando o nome é só espaços em branco", () => {
    expect(getInitials("   ", "ana@example.com")).toBe("A");
  });

  it("ignora espaços extras entre as palavras do nome", () => {
    expect(getInitials("Ana   Ribeiro", "ana@example.com")).toBe("AR");
  });
});
