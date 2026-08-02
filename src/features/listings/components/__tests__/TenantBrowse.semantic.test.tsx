import { fireEvent, render, screen } from "@testing-library/react";
import { TenantBrowse } from "../TenantBrowse";
import { useApprovedProperties, useSemanticPropertySearch, usePublicTenantRequests } from "../../hooks/useProperties";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../../hooks/useProperties", () => ({
  useApprovedProperties: jest.fn(),
  useSemanticPropertySearch: jest.fn(),
  usePublicTenantRequests: jest.fn(),
}));
jest.mock("@/src/features/auth/hooks/useSession", () => ({
  useSession: () => ({ data: { role: "tenant", fullName: "Test User", verificationStatus: "APPROVED" }, isLoading: false }),
}));

jest.mock("@/src/lib/api/browserClient", () => ({
  isApiClientError: (value: unknown) =>
    typeof value === "object" &&
    value !== null &&
    (value as { name?: string }).name === "ApiClientError",
}));

const approvedProperties = useApprovedProperties as jest.MockedFunction<
  typeof useApprovedProperties
>;
const semanticPropertySearch = useSemanticPropertySearch as jest.MockedFunction<
  typeof useSemanticPropertySearch
>;
const publicRequests = usePublicTenantRequests as jest.MockedFunction<
  typeof usePublicTenantRequests
>;


const noRelevantMatchResponse = {
  items: [],
  total: 0,
  resultCount: 0,
  page: 1 as const,
  pageSize: 10,
  reason: "NO_RELEVANT_SEMANTIC_MATCH" as const,
};

function successfulSemanticSearch(data = noRelevantMatchResponse) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useSemanticPropertySearch>;
}

function setupSemanticSearch(result = successfulSemanticSearch()) {
  approvedProperties.mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useApprovedProperties>);
  semanticPropertySearch.mockReturnValue(result);
  publicRequests.mockReturnValue({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as any);
}


function submitQuery(query = "شقة مفروشة في المنصورة") {
  fireEvent.change(screen.getByRole("textbox", { name: "ابحث بوصف العقار الذي تحتاجه" }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole("button", { name: "بحث ذكي" }));
}

describe("TenantBrowse semantic no-match feedback", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows actionable no-relevant-match guidance without exposing the backend reason", () => {
    setupSemanticSearch();
    render(<TenantBrowse />);
    submitQuery();

    expect(screen.getByText("ملقيناش عقار مناسب كفاية لطلبك")).toBeInTheDocument();
    expect(screen.getByText(/البحث اكتمل، لكن ما لقيناش عقار مناسب كفاية/)).toBeInTheDocument();
    expect(screen.getByText("حدّد المدينة أو المنطقة بشكل أوضح")).toBeInTheDocument();
    expect(screen.getByText("اكتب نوع العقار وعدد الغرف")).toBeInTheDocument();
    expect(screen.queryByText("NO_RELEVANT_SEMANTIC_MATCH")).not.toBeInTheDocument();
  });

  it("preserves and focuses the entered query without automatically retrying", () => {
    const result = successfulSemanticSearch();
    setupSemanticSearch(result);
    render(<TenantBrowse />);
    submitQuery();

    const input = screen.getByRole("textbox", { name: "ابحث بوصف العقار الذي تحتاجه" });
    expect(input).toHaveValue("شقة مفروشة في المنصورة");
    expect(result.refetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "عدّل طلبك وجرّب تاني" }));

    expect(input).toHaveFocus();
    expect(input).toHaveValue("شقة مفروشة في المنصورة");
    expect(result.refetch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "شقة غرفتين في المنصورة" } });
    fireEvent.click(screen.getByRole("button", { name: "بحث ذكي" }));
    expect(semanticPropertySearch).toHaveBeenLastCalledWith({
      query: "شقة غرفتين في المنصورة",
      limit: 10,
    });
  });

  it("keeps provider failures distinct from the no-match guidance", () => {
    const providerError = Object.assign(new Error("unavailable"), {
      name: "ApiClientError",
      statusCode: 503,
      body: { code: "SEMANTIC_SEARCH_UNAVAILABLE" },
    });
    setupSemanticSearch({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: providerError,
      refetch: jest.fn(),
    } as ReturnType<typeof useSemanticPropertySearch>);
    render(<TenantBrowse />);
    submitQuery();

    expect(
      screen.getByText("خدمة البحث الذكي غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل."),
    ).toBeInTheDocument();
    expect(screen.queryByText("ملقيناش عقار مناسب كفاية لطلبك")).not.toBeInTheDocument();
  });

  it("uses the existing generic empty state when the no-match reason is absent", () => {
    setupSemanticSearch(
      successfulSemanticSearch({
        items: [],
        total: 0,
        resultCount: 0,
        page: 1,
        pageSize: 10,
      }),
    );
    render(<TenantBrowse />);
    submitQuery();

    expect(screen.getByText("لم نجد عقارات مطابقة لوصفك حاليًا.")).toBeInTheDocument();
    expect(screen.queryByText("ملقيناش عقار مناسب كفاية لطلبك")).not.toBeInTheDocument();
  });
});
