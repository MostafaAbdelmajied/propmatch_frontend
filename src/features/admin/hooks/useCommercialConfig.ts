"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type {
  CheckoutPaymentType,
  CommercialCatalog,
  CommercialProduct,
  OwnerPlanType,
  PlanAllowances,
} from "@/src/lib/api/contracts/payment";

export function useCommercialConfig() {
  return useQuery({
    queryKey: ["admin", "commercial-config"],
    queryFn: () => api.get<CommercialCatalog>("admin/commercial-config"),
  });
}

export function useUpdatePlanConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planType, values }: { planType: OwnerPlanType; values: PlanAllowances }) =>
      api.patch<PlanAllowances>(`admin/commercial-config/plans/${planType}`, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "commercial-config"] });
      void queryClient.invalidateQueries({ queryKey: ["commercial-config"] });
      void queryClient.invalidateQueries({ queryKey: ["landlord", "quota"] });
    },
  });
}

export type ProductConfigurationInput = Pick<CommercialProduct, "priceEgp" | "enabled"> &
  Pick<CommercialProduct, "quantity" | "validityDays" | "durationDays">;

export function useUpdateProductConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentType,
      values,
    }: {
      paymentType: CheckoutPaymentType;
      values: ProductConfigurationInput;
    }) => api.patch<CommercialProduct>(`admin/commercial-config/products/${paymentType}`, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "commercial-config"] });
      void queryClient.invalidateQueries({ queryKey: ["commercial-config"] });
    },
  });
}
