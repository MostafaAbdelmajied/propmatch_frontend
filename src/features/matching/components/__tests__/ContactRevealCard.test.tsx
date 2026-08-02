import { render, screen } from "@testing-library/react";
import { ContactRevealCard } from "../ContactRevealCard";

describe("ContactRevealCard", () => {
  const props = { ownerName: "محمد السيد", ownerPhoneNumber: "01055556666" };

  it("shows the owner's name and a callable phone number", () => {
    render(<ContactRevealCard {...props} />);

    expect(screen.getByText("محمد السيد")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "01055556666" })).toHaveAttribute("href", "tel:01055556666");
  });

  it("always pairs the reveal with the ownership disclaimer", () => {
    // Non-negotiable: eKYC verifies identity, never ownership.
    render(<ContactRevealCard {...props} />);
    expect(screen.getByText(/أما ملكية العقار فيُقرّ بها المالك على مسؤوليته/)).toBeInTheDocument();
  });

  it("omits the address row when the server didn't send one", () => {
    render(<ContactRevealCard {...props} manualAddress={null} />);
    expect(screen.queryByText("عنوان العقار")).not.toBeInTheDocument();
  });
});
