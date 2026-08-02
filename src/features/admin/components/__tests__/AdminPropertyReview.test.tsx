import { fireEvent, render, screen } from "@testing-library/react";
import { AdminPropertyReview } from "../AdminPropertyReview";
import { useAdminPropertyReview, useReviewProperty } from "../../hooks/useAdmin";

jest.mock("../../hooks/useAdmin", () => ({ useAdminPropertyReview: jest.fn(), useReviewProperty: jest.fn() }));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getProperty = useAdminPropertyReview as jest.MockedFunction<typeof useAdminPropertyReview>;
const reviewProperty = useReviewProperty as jest.MockedFunction<typeof useReviewProperty>;
const property = {
  id: "property-1", title: "Test apartment", description: "Complete property description for moderation.",
  governorate: "Cairo", city: "Cairo", district: "Maadi", manualAddress: "Test street", propertyType: "APARTMENT" as const,
  rentAmount: 5000, areaM2: 100, bedrooms: 2, bathrooms: 1, isFurnished: true, hasElevator: true, hasParking: false,
  propertyAroundServices: "Metro", status: "PENDING" as const, createdAt: "2026-07-21T12:00:00.000Z",
  images: [{ id: "image-1", imageUrl: "https://example.test/one.jpg", displayOrder: 0, isCover: true }],
  ownerName: "Test landlord", ownerVerificationStatus: "APPROVED",
};

function renderReview() { return render(<AdminPropertyReview id="property-1" />); }

describe("AdminPropertyReview", () => {
  const mutate = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    getProperty.mockReturnValue({ data: property, isLoading: false, isError: false } as ReturnType<typeof useAdminPropertyReview>);
    reviewProperty.mockReturnValue({ mutate, isPending: false } as ReturnType<typeof useReviewProperty>);
  });

  it("renders complete property detail and contained images", () => {
    renderReview();
    expect(screen.getByText("Test apartment")).toBeInTheDocument();
    expect(screen.getByText("Test landlord")).toBeInTheDocument();
    expect(screen.getByText("Metro")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "صورة العقار 1" })).toHaveClass("object-contain");
  });

  it("submits approval through the property review action", () => {
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "قبول العقار" }));
    expect(mutate).toHaveBeenCalledWith({ decision: { decision: "approve", reason: undefined } }, expect.any(Object));
  });

  it("requires a rejection reason before submitting", () => {
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "رفض العقار" }));
    fireEvent.click(screen.getByRole("button", { name: "رفض العقار" }));
    expect(screen.getByText("سبب الرفض مطلوب")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns to the queue after a successful review", () => {
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "قبول العقار" }));
    const callbacks = mutate.mock.calls[0][1] as { onSuccess: () => void };
    callbacks.onSuccess();
    expect(push).toHaveBeenCalledWith("/admin");
  });
});
