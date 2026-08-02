"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import { SemanticPropertySearchResponseSchema } from "@/src/lib/api/contracts/property";
import type {
  PropertyDetail,
  PropertySearchQuery,
  PropertySummary,
  SemanticPropertySearchInput,
  SemanticPropertySearchResponse,
} from "@/src/lib/api/contracts/property";

interface Paginated<T> {
  items: T[];
  total: number;
}

/**
 * PRO-11 hybrid search: the hard filters below are SQL `WHERE` clauses on the
 * backend, while `q` is the semantic half (ChromaDB). Only send keys the user
 * actually set — an empty string would filter everything out.
 */
function toSearchParams(query: PropertySearchQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useApprovedProperties(query: PropertySearchQuery) {
  return useQuery({
    queryKey: ["properties", "browse", query],
    queryFn: () => api.get<Paginated<PropertySummary>>(`properties${toSearchParams(query)}`),
  });
}

/** Natural-language search for approved properties, triggered only on submit. */
export function useSemanticPropertySearch(input: SemanticPropertySearchInput | null) {
  const query = input?.query.trim() ?? "";
  const limit = input?.limit ?? 10;

  return useQuery({
    queryKey: ["properties", "semantic-search", query, limit],
    queryFn: () => {
      const params = new URLSearchParams({ query: query ?? "", limit: String(limit) });
      return api
        .get<unknown>(`properties/search/semantic?${params.toString()}`)
        .then((response): SemanticPropertySearchResponse =>
          SemanticPropertySearchResponseSchema.parse(response),
        );
    },
    enabled: query.length >= 2 && query.length <= 300 && limit >= 1 && limit <= 20,
    retry: false,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: () => api.get<PropertyDetail>(`properties/${id}`),
  });
}

export function useMyProperties() {
  return useQuery({
    queryKey: ["properties", "mine"],
    queryFn: () => api.get<Paginated<PropertySummary>>("landlord/properties"),
  });
}

export function usePublicTenantRequests() {
  return useQuery<{ items: any[] }>({
    queryKey: ["tenant-requests", "public"],
    queryFn: () => api.get<{ items: any[] }>("tenant-requests"),
  });
}

