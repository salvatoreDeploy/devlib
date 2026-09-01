import { afterEach, describe, expect, it } from "vitest";
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from "./auth-storage";

describe("auth-storage", () => {
  afterEach(() => {
    clearTokens();
  });

  it("getAccessToken/getRefreshToken retornam null quando nada foi salvo", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("saveTokens persiste accessToken e refreshToken", () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
  });

  it("clearTokens remove os tokens salvos", () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
