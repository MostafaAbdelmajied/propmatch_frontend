import { buildAdminTicketsPath } from "../useTickets";

describe("buildAdminTicketsPath", () => {
  it("includes server-side filters and pagination", () => {
    expect(
      buildAdminTicketsPath({
        status: "in_progress",
        commercialPriority: "PREMIUM",
        page: 3,
        pageSize: 10,
      }),
    ).toBe("admin/tickets?status=in_progress&commercialPriority=PREMIUM&page=3&pageSize=10");
  });

  it("omits all-value filters", () => {
    expect(buildAdminTicketsPath({ status: "all", commercialPriority: "ALL" })).toBe(
      "admin/tickets",
    );
  });
});
