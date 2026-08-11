// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>On Duty</Badge>);
    expect(screen.getByText("On Duty")).toBeInTheDocument();
  });

  it("applies the default variant styles", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("rounded-full");
  });

  it("merges a custom className", () => {
    render(<Badge className="custom-x">Tagged</Badge>);
    const el = screen.getByText("Tagged");
    expect(el).toHaveClass("custom-x");
    expect(el).toHaveClass("inline-flex");
  });

  it("forwards arbitrary props", () => {
    render(<Badge data-testid="b1">Props</Badge>);
    expect(screen.getByTestId("b1")).toBeInTheDocument();
  });
});
