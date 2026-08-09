import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditPropertyForm } from "../EditPropertyForm";

const mockUpdateMutate = jest.fn();
const mockToast = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockProperty = {
  id: "property-1",
  title: "شقة مميزة للإيجار",
  description: "وصف مكتمل يفي بالحد الأدنى المطلوب لتعديل العقار.",
  governorate: "الدقهلية",
  city: "المنصورة",
  district: "حي الجامعة",
  manualAddress: "شارع الجمهورية",
  propertyType: "APARTMENT",
  propertyAroundServices: "جامعة، مواصلات",
  rentAmount: 5000,
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  isFurnished: false,
  hasElevator: true,
  hasParking: true,
  images: [
    {
      id: "image-1",
      imageUrl: "/uploads/property.jpg",
      displayOrder: 0,
      isCover: true,
    },
  ],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
}));

jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/src/features/admin/hooks/useRegions", () => ({
  useActiveRegions: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/src/features/listings/hooks/useProperties", () => ({
  useProperty: () => ({
    data: mockProperty,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("../../hooks/useLandlord", () => ({
  useUpdateProperty: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

describe("EditPropertyForm review confirmation", () => {
  beforeEach(() => {
    mockUpdateMutate.mockReset();
    mockToast.mockReset();
    mockRouterPush.mockReset();
    mockRouterBack.mockReset();
  });

  async function openConfirmation() {
    const user = userEvent.setup();
    render(<EditPropertyForm propertyId="property-1" />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("شقة مميزة للإيجار")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "حفظ وإرسال للمراجعة" }));

    expect(
      await screen.findByRole("dialog", { name: "إرسال التعديلات للمراجعة" }),
    ).toBeInTheDocument();
    expect(mockUpdateMutate).not.toHaveBeenCalled();

    return user;
  }

  it("updates the property only after the landlord confirms", async () => {
    const user = await openConfirmation();

    await user.click(screen.getByRole("button", { name: "نعم، حفظ وإرسال" }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "شقة مميزة للإيجار",
        existingImageIds: ["image-1"],
      }),
      expect.any(Object),
    );
  });

  it("returns to editing without sending when the landlord cancels", async () => {
    const user = await openConfirmation();

    await user.click(screen.getByRole("button", { name: "العودة للتعديل" }));

    expect(
      screen.queryByRole("dialog", { name: "إرسال التعديلات للمراجعة" }),
    ).not.toBeInTheDocument();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });
});
