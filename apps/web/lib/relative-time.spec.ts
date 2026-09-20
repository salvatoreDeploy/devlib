import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const now = new Date("2026-09-20T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("retorna 'hoje' para uma data de menos de 1 dia atrás", () => {
    expect(formatRelativeTime("2026-09-20T02:00:00.000Z", now)).toBe("hoje");
  });

  it("retorna '1 dia atrás' para exatamente 1 dia atrás", () => {
    expect(formatRelativeTime("2026-09-19T12:00:00.000Z", now)).toBe(
      "1 dia atrás",
    );
  });

  it("retorna 'N dias atrás' no plural", () => {
    expect(formatRelativeTime("2026-09-17T12:00:00.000Z", now)).toBe(
      "3 dias atrás",
    );
  });

  it("retorna '1 semana atrás' entre 7 e 13 dias", () => {
    expect(formatRelativeTime("2026-09-13T12:00:00.000Z", now)).toBe(
      "1 semana atrás",
    );
  });

  it("retorna 'N semanas atrás' no plural", () => {
    expect(formatRelativeTime("2026-09-06T12:00:00.000Z", now)).toBe(
      "2 semanas atrás",
    );
  });

  it("retorna '1 mês atrás' entre 30 e 59 dias", () => {
    expect(formatRelativeTime("2026-08-20T12:00:00.000Z", now)).toBe(
      "1 mês atrás",
    );
  });

  it("retorna 'N meses atrás' no plural", () => {
    expect(formatRelativeTime("2026-06-20T12:00:00.000Z", now)).toBe(
      "3 meses atrás",
    );
  });

  it("retorna '1 ano atrás' a partir de 365 dias", () => {
    expect(formatRelativeTime("2025-09-20T12:00:00.000Z", now)).toBe(
      "1 ano atrás",
    );
  });

  it("retorna 'N anos atrás' no plural", () => {
    expect(formatRelativeTime("2024-06-20T12:00:00.000Z", now)).toBe(
      "2 anos atrás",
    );
  });
});
