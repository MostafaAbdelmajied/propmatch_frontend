export type AnalyticsPeriod = "7d" | "30d" | "current" | "lifetime";

export interface PropertyAnalytics {
  property: { id: string; title: string };
  period: AnalyticsPeriod;
  capabilities: {
    matches: boolean;
    boostedVsOrganic: boolean;
    conversion: boolean;
  };
  totals: {
    views: number;
    uniqueViews: number;
    favorites: number;
    tenantOffersReceived: number;
    reverseOffersSent: number;
    matches: number | null;
    organicViews: number | null;
    boostedViews: number | null;
    viewToOfferRate: number | null;
  };
  series: Array<{
    date: string;
    views: number;
    uniqueViews: number;
    favoritesAdded: number;
    favoritesRemoved: number;
    tenantOffersReceived: number;
    reverseOffersSent: number;
    matches: number | null;
    organicViews: number | null;
    boostedViews: number | null;
  }>;
}
