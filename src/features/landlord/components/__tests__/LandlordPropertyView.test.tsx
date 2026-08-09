import { render, screen } from "@testing-library/react";
import { LandlordPropertyView } from "../LandlordPropertyView";

let mockProperty: Record<string, unknown>;

jest.mock("@/src/features/listings/hooks/useProperties", () => ({
  useProperty: () => ({ data: mockProperty }),
}));
jest.mock("@/src/features/listings/components/PropertyDetailView", () => ({
  PropertyDetailView: () => <div>property-detail</div>,
}));
jest.mock("../PropertyAnalyticsPanel", () => ({
  PropertyAnalyticsPanel: () => <div>property-analytics</div>,
}));
jest.mock("../ArchivePropertyAction", () => ({
  ArchivePropertyAction: () => null,
}));
jest.mock("@/src/features/payments/PaymentSheet", () => ({ PaymentSheet: () => null }));
jest.mock("../../hooks/useLandlord", () => ({
  useBoostProperty: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteProperty: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

function property(status: string, rejectionReason: string | null) {
  return {
    id: "property-1",
    status,
    rejectionReason,
    isBoosted: false,
  };
}

describe("LandlordPropertyView review state", () => {
  it.each(["REJECTED", "PENDING"])(
    "shows the review reason and hides analytics while status is %s",
    (status) => {
      mockProperty = property(status, "يرجى تحسين صور العقار");
      render(<LandlordPropertyView id="property-1" />);

      expect(screen.getByText(/يرجى تحسين صور العقار/)).toBeInTheDocument();
      expect(screen.queryByText("property-analytics")).not.toBeInTheDocument();
    },
  );

  it("shows analytics only after approval", () => {
    mockProperty = property("APPROVED", null);
    render(<LandlordPropertyView id="property-1" />);
    expect(screen.getByText("property-analytics")).toBeInTheDocument();
  });
});
