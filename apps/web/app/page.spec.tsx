import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renderiza sem erros", () => {
    render(<Home />);
    expect(screen.getByTestId("home-page")).not.toBeNull();
  });
});
