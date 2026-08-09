"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, authApi, isApiClientError } from "@/src/lib/api/browserClient";
import { reconnectSocket } from "@/src/lib/socket/useRealtime";
import type {
  AuthResponse,
  EmailVerificationRequest,
  LoginRequest,
  RegistrationVerification,
  RegisterRequest,
  ResendEmailVerificationRequest,
  RequestAccountReview,
  RequestReactivationResponse,
  User,
} from "@/src/lib/api/contracts/auth";

const SESSION_KEY = ["session"] as const;

/** Current user, or null when unauthenticated (401 is treated as "no session"). */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<User | null> => {
      try {
        const res = await authApi.me<AuthResponse>();
        return res.user;
      } catch (e) {
        if (isApiClientError(e) && e.statusCode === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login<AuthResponse>(body),
    onSuccess: (res) => {
      qc.setQueryData(SESSION_KEY, res.user);
      // Re-auth the realtime socket with the freshly-set cookie.
      reconnectSocket();
    },
  });
}

/** POST /auth/request-reactivation — public, no session involved. */
export function useRequestReactivation() {
  return useMutation({
    mutationFn: (body: RequestAccountReview) =>
      api.post<RequestReactivationResponse>("auth/request-reactivation", body),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register<RegistrationVerification>(body),
  });
}

export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailVerificationRequest) => authApi.verifyEmail<AuthResponse>(body),
    onSuccess: (res) => {
      qc.setQueryData(SESSION_KEY, res.user);
      reconnectSocket();
    },
  });
}

export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (body: ResendEmailVerificationRequest) =>
      authApi.resendEmailVerification<{ sent: true }>(body),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(SESSION_KEY, null);
      qc.clear();
      // Drop the authenticated socket so it no longer sits in the old user's room.
      reconnectSocket();
      router.push("/");
    },
  });
}
