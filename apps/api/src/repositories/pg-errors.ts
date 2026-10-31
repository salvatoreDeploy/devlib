export const PG_INVALID_TEXT_REPRESENTATION = "22P02";
export const PG_UNIQUE_VIOLATION = "23505";

// o driver pg expõe o código em error.code; o Drizzle embrulha esse erro num
// DrizzleQueryError e o original fica em error.cause
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  const code = candidate.code ?? candidate.cause?.code;

  return typeof code === "string" ? code : undefined;
}
