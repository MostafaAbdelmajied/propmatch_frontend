import { ProfileScreen } from "@/src/features/profile/components/ProfileScreen";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";

export default async function ProfilePage() {
  await requireAnyRole(sharedRouteRoles.profile, "/profile");
  return <ProfileScreen />;
}
