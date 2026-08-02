import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserSchema, type AccountRole, type User } from "./contracts/auth";
import { landingAfterLogin } from "@/src/features/auth/roleRouting";

/**
 * Server-side session read for Server Components / layouts. Goes through our
 * own /api/auth/me route handler (same-origin) rather than calling the backend
 * directly, so it works uniformly whether the backend is the MSW mock (which
 * only intercepts route-handler fetches, not RSC fetches) or a real NestJS
 * instance. The route handler remains the authoritative check.
 */
export async function getServerSession(): Promise<User | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get("propmatch_access_token")) return null;

  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  // Forward the raw incoming Cookie header — guaranteed valid, unlike
  // reserializing the parsed cookie store.
  const cookieHeader = headerStore.get("cookie") ?? "";
  if (!host) return null;

  try {
    const res = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return UserSchema.parse(data.user);
  } catch {
    return null;
  }
}

/** Redirects to /login if there's no session. */
export async function requireSession(redirectTo: string): Promise<User> {
  const user = await getServerSession();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  return user;
}

/**
 * Requires a session **of a specific role**, sending anyone else to their own
 * landing page.
 *
 * Without this, a signed-in user of the wrong role renders the surface fine
 * and then every API call 403s — the screen fills with retry-able "something
 * went wrong" errors that can never succeed. This is UX routing only: the
 * backend's role guard is still the authority (docs/analysis/rbac.md).
 */
export async function requireRole(role: AccountRole, redirectTo: string): Promise<User> {
  const user = await requireSession(redirectTo);
  if (user.role !== role) redirect(landingAfterLogin(user.role));
  return user;
}
