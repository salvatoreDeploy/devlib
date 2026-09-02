import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRequireAuth } from "./use-require-auth";
import { clearTokens, saveTokens } from "./auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("useRequireAuth", () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearTokens();
  });

  it("redireciona pra /login quando não há access token", async () => {
    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(result.current).toBe(false);
  });

  it("não redireciona e retorna true quando há access token", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });

    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
