"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type {
  AnalyticsPeriod,
  PropertyAnalytics,
} from "@/src/lib/api/contracts/propertyAnalytics";

const VISITOR_ID_KEY = "propmatch:analytics-visitor-id";

function visitorId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  let value = window.localStorage.getItem(VISITOR_ID_KEY);
  if (!value) {
    value = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_ID_KEY, value);
  }
  return value;
}

export function useTrackPropertyView(propertyId: string) {
  useEffect(() => {
    const id = visitorId();
    if (!id) return;
    void api.post(`properties/${propertyId}/views`, { visitorId: id }).catch(() => {
      // Analytics must never block or degrade the property-view experience.
    });
  }, [propertyId]);
}

export function usePropertyAnalytics(propertyId: string, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ["properties", propertyId, "analytics", period],
    queryFn: () =>
      api.get<PropertyAnalytics>(`landlord/properties/${propertyId}/analytics?period=${period}`),
  });
}
