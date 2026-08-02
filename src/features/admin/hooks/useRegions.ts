"use client";

import { api } from "@/src/lib/api/browserClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface District {
  id: number;
  cityId: number;
  nameAr: string;
  nameEn: string;
  status: boolean;
}

export interface City {
  id: number;
  governorateId: number;
  nameAr: string;
  nameEn: string;
  status: boolean;
  districts: District[];
}

export interface Governorate {
  id: number;
  countryId: number;
  nameAr: string;
  nameEn: string;
  status: boolean;
  cities: City[];
}

export interface Country {
  id: number;
  nameAr: string;
  nameEn: string;
  code: string;
  image: string;
  status: boolean;
  governorates: Governorate[];
}

export interface CreateCountryRequest {
  nameAr: string;
  nameEn: string;
  code: string;
  image: string;
}

export interface CreateGovernorateRequest {
  countryId: number;
  nameAr: string;
  nameEn: string;
}

export interface CreateCityRequest {
  governorateId: number;
  nameAr: string;
  nameEn: string;
}

export interface CreateDistrictRequest {
  cityId: number;
  nameAr: string;
  nameEn: string;
}

export function useRegions() {
  return useQuery<Country[]>({
    queryKey: ["admin", "regions"],
    queryFn: () => api.get<Country[]>("regions"),
  });
}

export function useActiveRegions() {
  return useQuery<Country[]>({
    queryKey: ["regions", "active"],
    queryFn: () => api.get<Country[]>("regions/active"),
  });
}

export function useUpdateCountryStatus() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: number; status: boolean }>({
    mutationFn: ({ id, status }) =>
      api.patch<{ ok: boolean }>(`regions/countries/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useUpdateGovernorateStatus() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: number; status: boolean }>({
    mutationFn: ({ id, status }) =>
      api.patch<{ ok: boolean }>(`regions/governorates/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useUpdateCityStatus() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: number; status: boolean }>({
    mutationFn: ({ id, status }) =>
      api.patch<{ ok: boolean }>(`regions/cities/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useUpdateDistrictStatus() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: number; status: boolean }>({
    mutationFn: ({ id, status }) =>
      api.patch<{ ok: boolean }>(`regions/districts/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation<Country, Error, FormData>({
    mutationFn: (body) => api.postForm<Country>("regions/countries", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useCreateGovernorate() {
  const qc = useQueryClient();
  return useMutation<Governorate, Error, CreateGovernorateRequest>({
    mutationFn: (body) => api.post<Governorate>("regions/governorates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useCreateCity() {
  const qc = useQueryClient();
  return useMutation<City, Error, CreateCityRequest>({
    mutationFn: (body) => api.post<City>("regions/cities", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}

export function useCreateDistrict() {
  const qc = useQueryClient();
  return useMutation<District, Error, CreateDistrictRequest>({
    mutationFn: (body) => api.post<District>("regions/districts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
      qc.invalidateQueries({ queryKey: ["regions", "active"] });
    },
  });
}
