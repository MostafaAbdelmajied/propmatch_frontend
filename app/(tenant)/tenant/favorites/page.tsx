import { requireRole } from "@/src/lib/api/serverSession";
import { FavoritesList } from "@/src/features/listings/components/FavoritesList";

export default async function TenantFavoritesPage() {
  await requireRole("tenant", "/tenant/favorites");
  return <FavoritesList />;
}
