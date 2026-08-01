"use client";

import { useSession } from "@/src/features/auth/hooks/useSession";
import { FileCheck2, FileText, Heart, Inbox, MessageCircle, Search } from "lucide-react";
import { RoleNav, UserProfileHeaderNav } from "./RoleNav";

const items = [
  { href: "/tenant", label: "تصفّح", Icon: Search },
  { href: "/tenant/requests", label: "طلباتي", Icon: FileText },
  { href: "/tenant/offers", label: "العروض", Icon: Inbox },
  { href: "/contracts", label: "عقودي", Icon: FileCheck2 },
  { href: "/tenant/messages", label: "الرسائل", Icon: MessageCircle },
  { href: "/tenant/favorites", label: "المفضلة", Icon: Heart },
];

/** Client wrapper so Lucide icon components never cross the RSC boundary. */
export function TenantNav() {
  const { data: user } = useSession();
  const navItems = user ? items : [{ href: "/guest", label: "تصفّح", Icon: Search }];
  return <RoleNav items={navItems} rightSlot={<UserProfileHeaderNav />} />;
}
