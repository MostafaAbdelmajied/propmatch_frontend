import { fireEvent, render, screen } from "@testing-library/react";
import { MatchScoreRing } from "../MatchScoreRing";

describe("MatchScoreRing", () => {
  it("renders the percentage with Western Arabic numerals", () => {
    render(<MatchScoreRing score={87} />);
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  it("renders the no-match variant for a null score", () => {
    render(<MatchScoreRing score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exposes an accessible label", () => {
    render(<MatchScoreRing score={92} />);
    expect(screen.getByRole("img", { name: /نسبة التطابق/ })).toBeInTheDocument();
  });

  it("renders explainability reasons in the tooltip on click", () => {
    render(<MatchScoreRing score={92} reasons={["ضمن نطاق الميزانية المطلوبة", "يقع في منطقة مفضلة"]} />);
    fireEvent.click(screen.getByRole("img", { name: /نسبة التطابق/ }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("ضمن نطاق الميزانية المطلوبة")).toBeInTheDocument();
    expect(screen.getByText("يقع في منطقة مفضلة")).toBeInTheDocument();
  });

  it("omits the reasons list entirely when none are provided", () => {
    render(<MatchScoreRing score={92} />);
    fireEvent.click(screen.getByRole("img", { name: /نسبة التطابق/ }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
